/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useEffect, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  visualizeGeoFieldTrigger,
  VISUALIZE_GEO_FIELD_TRIGGER,
  UiActionsStart,
} from '../../../../../src/plugins/ui_actions/public';
import { APP_ID } from '../../common/constants';

interface Props {
  indexPatternId: string;
  fieldName: string;
  uiActions: UiActionsStart;
}

export function VisualizeGeoFieldButton(props: Props) {
  const [href, setHref] = useState<string | undefined>(undefined);

  async function loadHref() {
    const actions = await props.uiActions.getTriggerCompatibleActions(VISUALIZE_GEO_FIELD_TRIGGER, {
      indexPatternId: props.indexPatternId,
      fieldName: props.fieldName,
    });
    const triggerOptions = {
      indexPatternId: props.indexPatternId,
      fieldName: props.fieldName,
      trigger: visualizeGeoFieldTrigger,
    };
    const loadedHref = actions.length ? await actions[0].getHref?.(triggerOptions) : undefined;
    setHref(loadedHref);
  }

  useEffect(
    () => {
      loadHref();
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    []
  );

  function onClick(event: MouseEvent) {
    event.preventDefault();
    props.uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER).exec({
      indexPatternId: props.indexPatternId,
      fieldName: props.fieldName,
      originatingApp: APP_ID,
    });
  }

  return (
    <>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButton
        onClick={onClick}
        href={href}
        size="s"
        data-test-subj={`lensVisualize-GeoField-${props.fieldName}`}
      >
        <FormattedMessage
          id="xpack.lens.indexPattern.fieldItem.visualizeGeoFieldLinkText"
          defaultMessage="Visualize in Maps"
        />
      </EuiButton>
    </>
  );
}
