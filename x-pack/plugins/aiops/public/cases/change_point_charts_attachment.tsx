/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import type {
  ChangePointDetectionProps,
  ChangePointDetectionSharedComponent,
} from '../shared_components/change_point_detection';

export const initComponent = memoize(
  (
    fieldFormats: FieldFormatsStart,
    ChangePointDetectionComponent: ChangePointDetectionSharedComponent
  ) => {
    return React.memo(
      (props: PersistableStateAttachmentViewProps) => {
        const { persistableStateAttachmentState } = props;

        const dataFormatter = fieldFormats.deserialize({
          id: FIELD_FORMAT_IDS.DATE,
        });

        const inputProps = persistableStateAttachmentState as unknown as ChangePointDetectionProps;

        const listItems = [
          {
            title: (
              <FormattedMessage
                id="xpack.aiops.changePointDetection.cases.timeRangeLabel"
                defaultMessage="Time range"
              />
            ),
            description: `${dataFormatter.convert(
              inputProps.timeRange.from
            )} - ${dataFormatter.convert(inputProps.timeRange.to)}`,
          },
        ];

        return (
          <>
            <EuiDescriptionList compressed type={'inline'} listItems={listItems} />
            <ChangePointDetectionComponent {...inputProps} embeddingOrigin={'cases'} />
          </>
        );
      },
      (prevProps, nextProps) =>
        deepEqual(
          prevProps.persistableStateAttachmentState,
          nextProps.persistableStateAttachmentState
        )
    );
  }
);
