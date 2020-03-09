/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import { AlertsContextProvider, AlertAdd } from '../../../../../triggers_actions_ui/public';
import { TriggerActionsContext } from '../../../utils/triggers_actions_context';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../server/lib/alerting/metric_threshold/types';
import { SourceConfiguration } from '../../../utils/source_configuration';

interface Props {
  visible?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  derivedIndexPattern: IIndexPattern;
  source?: SourceConfiguration;
}

export const AlertFlyout = (props: Props) => {
  const { triggersActionsUI } = useContext(TriggerActionsContext);
  const { services } = useKibana();

  return (
    <>
      {triggersActionsUI && (
        <AlertsContextProvider
          value={{
            metadata: { source: props.source, derivedIndexPattern: props.derivedIndexPattern },
            http: services.http,
            actionTypeRegistry: triggersActionsUI.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUI.alertTypeRegistry,
          }}
        >
          <AlertAdd
            addFlyoutVisible={props.visible!}
            setAddFlyoutVisibility={props.setVisible}
            alertTypeId={METRIC_THRESHOLD_ALERT_TYPE_ID}
            canChangeTrigger={false}
            consumer={'metrics'}
          />
        </AlertsContextProvider>
      )}
    </>
  );
};
