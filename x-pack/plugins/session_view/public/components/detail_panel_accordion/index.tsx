/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiAccordion, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { useStyles } from './styles';
import { DetailPanelDescriptionList } from '../detail_panel_description_list';

interface DetailPanelAccordionDeps {
  id: string;
  listItems: Array<{
    title: NonNullable<ReactNode>;
    description: NonNullable<ReactNode>;
  }>;
  title: string;
  tooltipContent?: string;
  extraActionTitle?: string;
  onExtraActionClick?: () => void;
}

/**
 * An accordion section in session view detail panel.
 */
export const DetailPanelAccordion = ({
  id,
  listItems,
  title,
  tooltipContent,
  extraActionTitle,
  onExtraActionClick,
}: DetailPanelAccordionDeps) => {
  const styles = useStyles();

  return (
    <EuiAccordion
      id={id}
      arrowDisplay="right"
      buttonContent={
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={styles.accordionButton}
        >
          <EuiFlexItem grow={false}>
            <span>{title}</span>
          </EuiFlexItem>
          {tooltipContent && (
            <EuiFlexItem grow={false} data-test-subj="sessionView:detail-panel-accordion-tooltip">
              <EuiIconTip content={tooltipContent} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      extraAction={
        extraActionTitle ? (
          <EuiButtonEmpty
            size="s"
            color="primary"
            onClick={onExtraActionClick}
            data-test-subj="sessionView:detail-panel-accordion-action"
          >
            {extraActionTitle}
          </EuiButtonEmpty>
        ) : null
      }
      css={styles.accordion}
      data-test-subj="sessionView:detail-panel-accordion"
    >
      <DetailPanelDescriptionList listItems={listItems} />
    </EuiAccordion>
  );
};
