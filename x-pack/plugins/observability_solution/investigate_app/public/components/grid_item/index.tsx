/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import classNames from 'classnames';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTheme } from '../../hooks/use_theme';
import { InvestigateTextButton } from '../investigate_text_button';
import { InvestigateWidgetGridItemOverride } from '../investigate_widget_grid';

export const GRID_ITEM_HEADER_HEIGHT = 40;

interface GridItemProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  locked: boolean;
  onCopy: () => void;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onLockToggle: () => void;
  loading: boolean;
  faded: boolean;
  onOverrideRemove: (override: InvestigateWidgetGridItemOverride) => Promise<void>;
  onEditClick: () => void;
  overrides: InvestigateWidgetGridItemOverride[];
}

const editTitleButtonClassName = `investigateGridItemTitleEditButton`;

const titleContainerClassName = css`
  overflow: hidden;
`;
const titleItemClassName = css`
  max-width: 100%;
  .euiText {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const fadedClassName = css`
  opacity: 0.5 !important;
`;

const lockedControlClassName = css`
  opacity: 0.9 !important;
  &:hover {
    opacity: 1 !important;
  }
`;

const panelContainerClassName = css`
  overflow: clip;
  overflow-clip-margin: 20px;
`;

const panelClassName = css`
  overflow-y: auto;
`;

const panelContentClassName = css`
  overflow-y: auto;
  height: 100%;
  > [data-shared-item] {
    height: 100%;
  }
`;

const headerClassName = css`
  height: ${GRID_ITEM_HEADER_HEIGHT}px;
`;

const changeBadgeClassName = css`
  max-width: 96px;
  .euiText {
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

export function GridItem({
  id,
  title,
  description,
  children,
  locked,
  onLockToggle,
  onDelete,
  onCopy,
  loading,
  faded,
  overrides,
  onOverrideRemove,
  onEditClick,
}: GridItemProps) {
  const theme = useTheme();

  const containerClassName = css`
    height: 100%;
    max-width: 100%;
    transition: opacity ${theme.animation.normal} ${theme.animation.resistance};
    overflow: auto;

    &:not(:hover) .${editTitleButtonClassName} {
      opacity: 0;
    }
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={faded ? classNames(containerClassName, fadedClassName) : containerClassName}
      alignItems="stretch"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="row"
          gutterSize="m"
          alignItems="center"
          className={headerClassName}
        >
          <EuiFlexItem className={titleContainerClassName}>
            <EuiText size="s" className={titleItemClassName}>
              {title}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {overrides.length ? (
              <EuiFlexGroup direction="row" gutterSize="xs" justifyContent="flexStart">
                {overrides.map((override) => (
                  <EuiFlexItem key={override.id} grow={false}>
                    <EuiBadge
                      color="primary"
                      className={changeBadgeClassName}
                      iconType="cross"
                      iconSide="right"
                      iconOnClick={() => {
                        onOverrideRemove(override);
                      }}
                      iconOnClickAriaLabel={i18n.translate(
                        'xpack.investigateApp.gridItem.removeOverrideButtonAriaLabel',
                        {
                          defaultMessage: 'Remove filter',
                        }
                      )}
                    >
                      <EuiText size="xs">{override.label}</EuiText>
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="gridItemControls">
            <EuiFlexGroup
              direction="row"
              gutterSize="xs"
              alignItems="center"
              justifyContent="flexEnd"
            >
              <EuiFlexItem grow={false}>
                <InvestigateTextButton
                  iconType="copy"
                  onClick={() => {
                    onCopy();
                  }}
                  disabled={loading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InvestigateTextButton
                  iconType="trash"
                  onClick={() => {
                    onDelete();
                  }}
                  disabled={loading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InvestigateTextButton
                  iconType="pencil"
                  onClick={() => {
                    onEditClick();
                  }}
                  disabled={loading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InvestigateTextButton
                  iconType={locked ? 'lock' : 'lockOpen'}
                  className={locked ? lockedControlClassName : ''}
                  color={locked ? 'primary' : 'text'}
                  onClick={() => {
                    onLockToggle();
                  }}
                  disabled={loading}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow className={panelContainerClassName}>
        <EuiPanel hasBorder hasShadow={false} className={panelClassName}>
          <div className={panelContentClassName}>{children}</div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
