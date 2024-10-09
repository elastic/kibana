/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
} from '@elastic/eui';
import { DatasetQualityLink } from './dataset_quality_link';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

interface LegendActionProps {
  idx: number;
  popoverOpen: string | null;
  togglePopover: (streamName: string | null) => void;
  label: string;
}

export const LegendAction: React.FC<LegendActionProps> = React.memo(
  ({ label, idx, popoverOpen, togglePopover }) => {
    const uniqueStreamName = `${idx}-${label}`;
    const {
      services: {
        share: {
          url: { locators },
        },
        application: { capabilities },
      },
    } = useKibanaContextForPlugin();
    const hasDataSetQualityFeature = !!capabilities?.data_quality;
    const hasIndexManagementFeature = !!capabilities?.index_management;

    const onClickIndexManagement = useCallback(async () => {
      // TODO: use proper index management locator https://github.com/elastic/kibana/issues/195083
      const dataQualityLocator = locators.get('MANAGEMENT_APP_LOCATOR');
      if (dataQualityLocator) {
        await dataQualityLocator.navigate({
          sectionId: 'data',
          appId: `index_management/data_streams/${label}`,
        });
      }
      togglePopover(null); // Close the popover after action
    }, [label, locators, togglePopover]);

    const onCopyDataStreamName = useCallback(() => {
      navigator.clipboard.writeText(label);
      togglePopover(null); // Close popover after copying
    }, [label, togglePopover]);

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiPopover
          button={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="boxesHorizontal"
                  aria-label="Open data stream actions"
                  onClick={() => togglePopover(uniqueStreamName)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          isOpen={popoverOpen === uniqueStreamName}
          closePopover={() => togglePopover(null)}
          anchorPosition="downRight"
        >
          <EuiListGroup gutterSize="none">
            <EuiListGroupItem label="Copy data stream name" onClick={onCopyDataStreamName} />
            <EuiSpacer size="s" />

            {hasIndexManagementFeature && (
              <EuiListGroupItem label="Manage data stream" onClick={onClickIndexManagement} />
            )}
            {hasDataSetQualityFeature && <DatasetQualityLink dataStreamName={label} />}
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexGroup>
    );
  }
);
