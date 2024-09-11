/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/css';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { ErrorMessage } from '../../components/error_message';
import { useKibana } from '../../hooks/use_kibana';
import { Options } from '../register_items';

const embeddableClassName = css`
  height: 100%;
  > [data-shared-item] {
    height: 100%;
  }
`;

type Props = EmbeddableItemParams & GlobalWidgetParameters;

type ParentApi = ReturnType<React.ComponentProps<typeof ReactEmbeddableRenderer>['getParentApi']>;

function ReactEmbeddable({ type, config, timeRange: { from, to }, savedObjectId }: Props) {
  const configWithOverrides = useMemo(() => {
    return {
      ...config,
      timeRange: {
        from,
        to,
      },
    };
  }, [config, from, to]);

  const configWithOverridesRef = useRef(configWithOverrides);

  configWithOverridesRef.current = configWithOverrides;

  const api = useMemo<ParentApi>(() => {
    return {
      getSerializedStateForChild: () => ({ rawState: configWithOverridesRef.current }),
    };
  }, []);

  return (
    <ReactEmbeddableRenderer
      type={type}
      getParentApi={() => api}
      maybeId={savedObjectId}
      onAnyStateChange={(state) => {
        // console.log('onAnyStateChange', state);
      }}
      onApiAvailable={(childApi) => {
        // console.log('onApiAvailable', childApi);
      }}
      hidePanelChrome
    />
  );
}

function LegacyEmbeddable({ type, config, timeRange: { from, to }, savedObjectId }: Props) {
  const {
    dependencies: {
      start: { embeddable },
    },
  } = useKibana();

  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const embeddableInstanceAsync = useAbortableAsync(async () => {
    const factory = embeddable.getEmbeddableFactory(type);

    if (!factory) {
      throw new Error(`Cannot find embeddable factory for ${type}`);
    }

    const configWithId = {
      id: savedObjectId ?? v4(),
      ...config,
    };

    const configWithOverrides = {
      ...configWithId,
      timeRange: {
        from,
        to,
      },
    };

    if (savedObjectId) {
      return factory.createFromSavedObject(configWithOverrides.id, configWithOverrides);
    }

    const instance = await factory.create(configWithOverrides);

    return instance;
  }, [type, savedObjectId, config, from, to, embeddable]);

  const embeddableInstance = embeddableInstanceAsync.value;

  useEffect(() => {
    if (!targetElement || !embeddableInstance) {
      return;
    }

    embeddableInstance.render(targetElement);

    return () => {};
  }, [embeddableInstance, targetElement]);

  useEffect(() => {
    return () => {
      if (embeddableInstance) {
        embeddableInstance.destroy();
      }
    };
  }, [embeddableInstance]);

  if (embeddableInstanceAsync.error) {
    return <ErrorMessage error={embeddableInstanceAsync.error} />;
  }

  if (!embeddableInstance) {
    return <EuiLoadingSpinner />;
  }

  return (
    <div
      className={embeddableClassName}
      ref={(element) => {
        setTargetElement(element);
      }}
    />
  );
}

function EmbeddableWidget(props: Props) {
  const {
    dependencies: {
      start: { embeddable },
    },
  } = useKibana();

  if (embeddable.reactEmbeddableRegistryHasKey(props.type)) {
    return <ReactEmbeddable {...props} />;
  }

  return <LegacyEmbeddable {...props} />;
}

interface EmbeddableItemParams {
  type: string;
  config: Record<string, any>;
  savedObjectId?: string;
}

export function registerEmbeddableItem({
  dependencies: {
    setup: { investigate },
  },
  services,
}: Options) {
  investigate.registerItemDefinition<EmbeddableItemParams, {}>({
    type: 'embeddable',
    generate: async (option: {
      itemParams: EmbeddableItemParams;
      globalParams: GlobalWidgetParameters;
    }) => {
      return {};
    },
    render: (option: {
      itemParams: EmbeddableItemParams;
      globalParams: GlobalWidgetParameters;
    }) => {
      const parameters = {
        type: option.itemParams.type,
        config: option.itemParams.config,
        savedObjectId: option.itemParams.savedObjectId,
        timeRange: option.globalParams.timeRange,
      };

      return <EmbeddableWidget {...parameters} />;
    },
  });
}
