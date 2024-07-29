/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/css';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_WIDGET_NAME } from '../../constants';
import { useKibana } from '../../hooks/use_kibana';
import { RegisterWidgetOptions } from '../register_widgets';
import { EmbeddableWidgetParameters } from './types';
import { ErrorMessage } from '../../components/error_message';

const embeddableClassName = css`
  height: 100%;
  > [data-shared-item] {
    height: 100%;
  }
`;

type Props = EmbeddableWidgetParameters & GlobalWidgetParameters;

type ParentApi = ReturnType<React.ComponentProps<typeof ReactEmbeddableRenderer>['getParentApi']>;

function ReactEmbeddable({ type, config, filters, timeRange: { from, to }, savedObjectId }: Props) {
  const configWithOverrides = useMemo(() => {
    return {
      ...config,
      filters,
      timeRange: {
        from,
        to,
      },
    };
  }, [config, filters, from, to]);

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

function LegacyEmbeddable({
  type,
  config,
  filters,
  timeRange: { from, to },
  savedObjectId,
}: Props) {
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
      filters,
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
  }, [type, savedObjectId, config, from, to, embeddable, filters]);

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

export function registerEmbeddableWidget({ registerWidget }: RegisterWidgetOptions) {
  registerWidget(
    {
      type: EMBEDDABLE_WIDGET_NAME,
      description: 'Display a saved embeddable',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          config: {
            type: 'object',
          },
          savedObjectId: {
            type: 'string',
          },
        },
        required: ['type', 'config'],
      } as const,
    },
    async ({ parameters, signal }) => {
      return {};
    },
    ({ widget }) => {
      const parameters = {
        type: widget.parameters.type,
        config: widget.parameters.config,
        savedObjectId: widget.parameters.savedObjectId,
        timeRange: widget.parameters.timeRange,
        filters: widget.parameters.filters,
        query: widget.parameters.query,
      };

      return <EmbeddableWidget {...parameters} />;
    }
  );
}
