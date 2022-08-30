/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { EuiDescriptionList } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { MlStartDependencies } from '../plugin';
import { getEmbeddableComponent } from '../embeddables';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, AnomalySwimlaneEmbeddableInput } from '..';

export function initComponent(coreStart: CoreStart, pluginStart: MlStartDependencies) {
  const EmbeddableComponent = getEmbeddableComponent(
    ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    coreStart,
    pluginStart
  );

  return React.memo((props: PersistableStateAttachmentViewProps) => {
    const { persistableStateAttachmentState } = props;

    const dataFormatter = pluginStart.fieldFormats.deserialize({
      id: FIELD_FORMAT_IDS.DATE,
    });

    const inputProps = persistableStateAttachmentState as unknown as AnomalySwimlaneEmbeddableInput;

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
  });
}
