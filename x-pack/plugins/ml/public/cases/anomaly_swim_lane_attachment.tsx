/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { memoize } from 'lodash';
import React from 'react';
import { CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE } from '../../common/constants/cases';
import type {
  AnomalySwimLaneEmbeddableApi,
  AnomalySwimLaneEmbeddableState,
} from '../embeddables/anomaly_swimlane/types';

export const initComponent = memoize((fieldFormats: FieldFormatsStart) => {
  return React.memo(
    (props: PersistableStateAttachmentViewProps) => {
      const { persistableStateAttachmentState, caseData } = props;

      const dataFormatter = fieldFormats.deserialize({
        id: FIELD_FORMAT_IDS.DATE,
      });

      const inputProps =
        persistableStateAttachmentState as unknown as AnomalySwimLaneEmbeddableState;

      const listItems = [
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
            inputProps.timeRange!.from
          )} - ${dataFormatter.convert(inputProps.timeRange!.to)}`,
        },
      ];

      if (typeof inputProps.query?.query === 'string' && inputProps.query?.query !== '') {
        listItems.push({
          title: (
            <FormattedMessage
              id="xpack.ml.cases.anomalySwimLane.description.queryLabel"
              defaultMessage="Query"
            />
          ),
          description: inputProps.query?.query,
        });
      }

      return (
        <>
          <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
          <ReactEmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
            maybeId={inputProps.id}
            type={CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE}
            state={{
              rawState: inputProps,
            }}
            parentApi={{
              executionContext: {
                type: 'cases',
                description: caseData.title,
                id: caseData.id,
              },
            }}
          />
        </>
      );
    },
    (prevProps, nextProps) =>
      deepEqual(
        prevProps.persistableStateAttachmentState,
        nextProps.persistableStateAttachmentState
      )
  );
});
