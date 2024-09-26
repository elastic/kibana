/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ViewType } from '.';

function EntityTableViewSelectionOption({
  title,
  description,
  active,
  icon,
  onClick,
}: {
  title: string;
  active: boolean;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <EuiButton
      data-test-subj="inventoryEntityTableViewSelectionOptionButton"
      onClick={() => {
        onClick();
      }}
      className={css`
        border-radius: 0px;
        height: auto;
        > span {
          display: inline-flex;
          justify-content: flex-end;
          padding: 16px;
        }
      `}
      color={active ? 'primary' : 'text'}
      fill={active}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexEnd">
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiText
            size="s"
            className={css`
              font-weight: 600;
            `}
          >
            {title}
          </EuiText>
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText
          size="xs"
          className={css`
            opacity: 0.75;
          `}
        >
          {description}
        </EuiText>
      </EuiFlexGroup>
    </EuiButton>
  );
}

export function EntityTableViewSelection({
  viewType,
  onViewTypeChange,
}: {
  viewType: ViewType;
  onViewTypeChange: (next: ViewType) => void;
}) {
  return (
    <EuiFlexGrid direction="row" gutterSize="m" columns={4}>
      <EuiFlexItem />
      <EuiFlexItem />
      <EntityTableViewSelectionOption
        title={i18n.translate('xpack.inventory.entityTableViewSelection.defaultPanelTitle', {
          defaultMessage: 'Default',
        })}
        active={viewType === 'default'}
        icon="dot"
        onClick={() => {
          onViewTypeChange('default');
        }}
        description={i18n.translate(
          'xpack.inventory.entityTableViewSelection.defaultPanelDescription',
          {
            defaultMessage: 'The default view',
          }
        )}
      />
      <EntityTableViewSelectionOption
        title={i18n.translate('xpack.inventory.entityTableViewSelection.unhealthyPanelTitle', {
          defaultMessage: 'Unhealthy',
        })}
        active={viewType === 'unhealthy'}
        icon="warning"
        onClick={() => {
          onViewTypeChange('unhealthy');
        }}
        description={i18n.translate(
          'xpack.inventory.entityTableViewSelection.unhealthyPanelDescription',
          {
            defaultMessage: 'Show entities with alerts or unhealthy SLOs',
          }
        )}
      />
    </EuiFlexGrid>
  );
}
