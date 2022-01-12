/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  ENTITY_FIELD_OPERATIONS,
  EntityFieldOperation,
} from '../../../../../../../common/util/anomaly_utils';
import { blurButtonOnClick } from '../../../../../util/component_utils';
import './_entity_filter.scss';

interface EntityFilterProps {
  onFilter: (params: {
    influencerFieldName: string;
    influencerFieldValue: string;
    action: EntityFieldOperation;
  }) => void;
  influencerFieldName: string;
  influencerFieldValue: string;
}
export const EntityFilter: FC<EntityFilterProps> = ({
  onFilter,
  influencerFieldName,
  influencerFieldValue,
}) => {
  return (
    <React.Fragment>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.entityFilter.addFilterTooltip"
            defaultMessage="Add filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={blurButtonOnClick(() => {
            onFilter({
              influencerFieldName,
              influencerFieldValue,
              action: ENTITY_FIELD_OPERATIONS.ADD,
            });
          })}
          iconType="plusInCircle"
          aria-label={i18n.translate('xpack.ml.entityFilter.addFilterAriaLabel', {
            defaultMessage: 'Add filter for {influencerFieldName} {influencerFieldValue}',
            values: { influencerFieldName, influencerFieldValue },
          })}
        />
      </EuiToolTip>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.entityFilter.removeFilterTooltip"
            defaultMessage="Remove filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={blurButtonOnClick(() => {
            onFilter({
              influencerFieldName,
              influencerFieldValue,
              action: ENTITY_FIELD_OPERATIONS.REMOVE,
            });
          })}
          iconType="minusInCircle"
          aria-label={i18n.translate('xpack.ml.entityFilter.removeFilterAriaLabel', {
            defaultMessage: 'Remove filter for {influencerFieldName} {influencerFieldValue}',
            values: { influencerFieldName, influencerFieldValue },
          })}
        />
      </EuiToolTip>
    </React.Fragment>
  );
};
