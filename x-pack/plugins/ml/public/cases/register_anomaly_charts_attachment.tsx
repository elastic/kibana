/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import type { CasesUiSetup } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  AnomalyChartsEmbeddableInput,
  getEmbeddableComponent,
} from '../embeddables';
import type { MlStartDependencies } from '../plugin';
import { PLUGIN_ICON } from '../../common/constants/app';

export function registerAnomalyChartsCasesAttachment(
  cases: CasesUiSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  cases.attachmentFramework.registerPersistableState({
    id: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    icon: PLUGIN_ICON,
    displayName: i18n.translate('xpack.ml.cases.anomalyCharts.displayName', {
      defaultMessage: 'Anomaly charts',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.ml.cases.anomalyCharts.embeddableAddedEvent"
          defaultMessage="added the Anomaly Charts embeddable"
        />
      ),
      timelineAvatar: PLUGIN_ICON,
      children: React.lazy(() => {
        return Promise.resolve().then(() => {
          const EmbeddableComponent = getEmbeddableComponent(
            ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
            coreStart,
            pluginStart
          );

          return {
            default: React.memo((props: PersistableStateAttachmentViewProps) => {
              const { persistableStateAttachmentState } = props;

              const dataFormatter = pluginStart.fieldFormats.deserialize({
                id: FIELD_FORMAT_IDS.DATE,
              });

              const inputProps =
                persistableStateAttachmentState as unknown as AnomalyChartsEmbeddableInput;

              return (
                <>
                  <EuiDescriptionList
                    compressed
                    type={'inline'}
                    listItems={[
                      {
                        title: (
                          <FormattedMessage
                            id="xpack.ml.cases.anomalyCharts.description.jobIdsLabel"
                            defaultMessage="Job IDs"
                          />
                        ),
                        description: inputProps.jobIds.join(', '),
                      },
                      {
                        title: (
                          <FormattedMessage
                            id="xpack.ml.cases.anomalyCharts.description.timeRangeLabel"
                            defaultMessage="Time range"
                          />
                        ),
                        description: `${dataFormatter.convert(
                          inputProps.timeRange.from
                        )} - ${dataFormatter.convert(inputProps.timeRange.to)}`,
                      },
                    ]}
                  />
                  <EmbeddableComponent {...inputProps} />
                </>
              );
            }),
          };
        });
      }),
    }),
  });
}
