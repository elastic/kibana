/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiFormRow,
} from '@elastic/eui';

import { CommonBaseAlert, CommonAlertParamDetail } from '../../../common/types';
import { AlertPopoverContext } from './lib';
import { Legacy } from '../../legacy_shims';
import { AlertParamType } from '../../../common/enums';
import { AlertPopoverConfigureNumberParam } from './configure_number_param';
import { AlertPopoverConfigureDurationParam } from './configure_duration_param';

interface AlertPopoverConfigureParamProps {
  name: string;
  details: CommonAlertParamDetail;
  value: string | number;
  done: (alert: CommonBaseAlert) => void;
  cancel: () => void;
}
export const AlertPopoverConfigureParam: React.FC<AlertPopoverConfigureParamProps> = (
  props: AlertPopoverConfigureParamProps
) => {
  const { done, cancel, name, details } = props;
  const context = React.useContext(AlertPopoverContext);
  const [isSaving, setIsSaving] = React.useState(false);
  const [body, setBody] = React.useState({});

  async function save() {
    setIsSaving(true);
    let alert;
    try {
      alert = await Legacy.shims.kfetch({
        method: 'PUT',
        pathname: `/api/monitoring/v1/alert/${context.alert.type}`,
        body: JSON.stringify({
          params: body,
        }),
      });
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: `Error saving ${name}`,
        text: err.message,
      });
    }
    setIsSaving(false);
    done(alert);
  }

  function mergeBody(newBody: {}) {
    setBody({ ...body, ...newBody });
  }
  let configureUi = null;
  switch (details.type) {
    case AlertParamType.Number:
      configureUi = (
        <AlertPopoverConfigureNumberParam
          name={name}
          number={props.value as number}
          setBody={mergeBody}
        />
      );
      break;
    case AlertParamType.Duration:
      configureUi = (
        <AlertPopoverConfigureDurationParam
          name={name}
          duration={props.value as string}
          setBody={mergeBody}
        />
      );
      break;
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={cancel} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Configure {name}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label={details.rawLabel}>{configureUi}</EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty size="s" onClick={cancel}>
            Cancel
          </EuiButtonEmpty>
          <EuiButton size="s" onClick={save} isDisabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
