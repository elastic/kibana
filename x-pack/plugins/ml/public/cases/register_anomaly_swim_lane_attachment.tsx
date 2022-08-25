/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonIcon, EuiDescriptionList } from '@elastic/eui';
import { CasesUiSetup } from '@kbn/cases-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { MlStartDependencies } from '../plugin';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, AnomalySwimlaneEmbeddableInput } from '..';
import { PLUGIN_ICON } from '../../common/constants/app';
import { getAnomalySwimLaneEmbeddableComponent } from '../embeddables/anomaly_swimlane';

const AttachmentActions: React.FC = () => {
  return (
    <EuiButtonIcon
      data-test-subj="test-attachment-action"
      onClick={() => {}}
      iconType="boxesHorizontal"
      aria-label="See attachment"
    />
  );
};

export function registerAnomalySwimLaneCasesAttachment(
  cases: CasesUiSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  cases.attachmentFramework.registerPersistableState({
    id: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    icon: PLUGIN_ICON,
    // TODO check where this name is presented
    displayName: i18n.translate('xpack.ml.cases.anomalySwimLane.displayName', {
      defaultMessage: 'Anomaly swim lane',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.ml.cases.anomalySwimLane.embeddableAddedEvent"
          defaultMessage="added the Anomaly Swim Lane embeddable"
        />
      ),
      timelineAvatar: PLUGIN_ICON,
      actions: <AttachmentActions />,
      children: React.lazy(() => {
        return Promise.resolve().then(() => {
          const EmbeddableComponent = getAnomalySwimLaneEmbeddableComponent(coreStart, pluginStart);

          return {
            default: React.memo((props: PersistableStateAttachmentViewProps) => {
              const { persistableStateAttachmentState } = props;

              const dataFormatter = pluginStart.fieldFormats.deserialize({
                id: FIELD_FORMAT_IDS.DATE,
              });

              const inputProps =
                persistableStateAttachmentState as unknown as AnomalySwimlaneEmbeddableInput;

              return (
                <>
                  <EuiDescriptionList
                    compressed
                    type={'inline'}
                    listItems={[
                      {
                        title: (
                          <FormattedMessage
                            id="xpack.ml.cases.anomalySwimLane.description.jobIdsLabel"
                            defaultMessage="Job IDs"
                          />
                        ),
                        description: inputProps.jobIds.join(', '),
                      },
                      ...(inputProps.viewBy
                        ? [
                            {
                              title: (
                                <FormattedMessage
                                  id="xpack.ml.cases.anomalySwimLane.description.viewByLabel"
                                  defaultMessage="View by"
                                />
                              ),
                              description: inputProps.viewBy,
                            },
                          ]
                        : []),
                      {
                        title: (
                          <FormattedMessage
                            id="xpack.ml.cases.anomalySwimLane.description.timeRangeLabel"
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
