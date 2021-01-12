/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { EmbeddedMapComponent } from './embedded_map';
import { AnomalyRecordDoc } from '../../../../../common/types/anomalies';

interface Props {
  anomalies: AnomalyRecordDoc[];
}

export const ExplorerMapContainer: FC<Props> = ({ anomalies }) => {
  return (
    <>
      <EuiPanel data-test-subj="mlAnomalyExplorerAnomaliesMap loaded">
        <EuiAccordion
          id="mlAnomalyExplorerAnomaliesMapAccordionId"
          initialIsOpen={true}
          buttonContent={
            <EuiTitle className="panel-title">
              <h2>
                <FormattedMessage id="xpack.ml.explorer.mapTitle" defaultMessage="Anomaly Map" />
              </h2>
            </EuiTitle>
          }
        >
          <>
            <EmbeddedMapComponent anomalies={anomalies} />
          </>
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
