/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EMPTY_FIELD_VALUE_LABEL } from '../../timeseriesexplorer/components/entity_control/entity_control';
import { MLCATEGORY } from '../../../../common/constants/field_types';
import { ENTITY_FIELD_OPERATIONS } from '../../../../common/util/anomaly_utils';
import { blurButtonOnClick } from '../../util/component_utils';

export type EntityCellFilter = (
  entityName: string,
  entityValue: string,
  direction: '+' | '-'
) => void;

interface EntityCellProps {
  entityName: string;
  entityValue: string;
  filter?: EntityCellFilter;
  wrapText?: boolean;
}

function getAddFilter({ entityName, entityValue, filter }: EntityCellProps) {
  if (filter !== undefined) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.anomaliesTable.entityCell.addFilterTooltip"
            defaultMessage="Add filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={blurButtonOnClick(() => {
            filter(entityName, entityValue, ENTITY_FIELD_OPERATIONS.ADD);
          })}
          iconType="plusInCircle"
          aria-label={i18n.translate('xpack.ml.anomaliesTable.entityCell.addFilterAriaLabel', {
            defaultMessage: 'Add filter',
          })}
        />
      </EuiToolTip>
    );
  }
}

function getRemoveFilter({ entityName, entityValue, filter }: EntityCellProps) {
  if (filter !== undefined) {
    return (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.ml.anomaliesTable.entityCell.removeFilterTooltip"
            defaultMessage="Remove filter"
          />
        }
      >
        <EuiButtonIcon
          size="s"
          className="filter-button"
          onClick={blurButtonOnClick(() => {
            filter(entityName, entityValue, ENTITY_FIELD_OPERATIONS.REMOVE);
          })}
          iconType="minusInCircle"
          aria-label={i18n.translate('xpack.ml.anomaliesTable.entityCell.removeFilterAriaLabel', {
            defaultMessage: 'Remove filter',
          })}
        />
      </EuiToolTip>
    );
  }
}

/*
 * Component for rendering an entity, displaying the value
 * of the entity, such as a partitioning or influencer field value, and optionally links for
 * adding or removing a filter on this entity.
 */
export const EntityCell: FC<EntityCellProps> = ({
  entityName,
  entityValue,
  filter,
  wrapText = false,
}) => {
  let valueText = entityValue === '' ? <i>{EMPTY_FIELD_VALUE_LABEL}</i> : entityValue;
  if (entityName === MLCATEGORY) {
    valueText = `${MLCATEGORY} ${valueText}`;
  }

  const textStyle = { maxWidth: '100%' };
  const textWrapperClass = wrapText ? 'field-value-long' : 'field-value-short';
  const shouldDisplayIcons =
    filter !== undefined && entityName !== undefined && entityValue !== undefined;

  if (wrapText === true) {
    return (
      <div>
        <span className={textWrapperClass}>{valueText}</span>
        {shouldDisplayIcons && (
          <React.Fragment>
            {getAddFilter({ entityName, entityValue, filter })}
            {getRemoveFilter({ entityName, entityValue, filter })}
          </React.Fragment>
        )}
      </div>
    );
  } else {
    return (
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false} style={textStyle}>
          <EuiText size="xs" className={textWrapperClass}>
            {valueText}
          </EuiText>
        </EuiFlexItem>
        {shouldDisplayIcons && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {getAddFilter({ entityName, entityValue, filter })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {getRemoveFilter({ entityName, entityValue, filter })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
};
