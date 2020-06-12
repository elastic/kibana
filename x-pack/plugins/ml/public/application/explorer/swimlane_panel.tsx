/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useState } from 'react';
import {
  EuiPanel,
  EuiTextAlign,
  EuiPopover,
  EuiContextMenuPanel,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MlTooltipComponent } from '../components/chart_tooltip';
import { ExplorerSwimlane } from './explorer_swimlane';
import { SwimlaneType } from './explorer_constants';
import { AddToDashboardControl } from './add_to_dashboard_control';
import { JobId } from '../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../contexts/kibana';
import { TimeBuckets } from '../util/time_buckets';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';

interface SwimlanePanelProps {
  jobIds: JobId[];
  swimlaneType: SwimlaneType;
  swimlaneData: any;
  swimlaneContainerWidth: number;
  filterActive: any;
  maskAll: boolean;
  selectedCells: any;
  swimlaneCellClick: () => void;
  swimlaneRenderDoneListener: () => void;
}

export const SwimlanePanel: FC<SwimlanePanelProps> = ({
  jobIds,
  swimlaneType,
  swimlaneData,
  swimlaneContainerWidth,
  filterActive,
  maskAll,
  selectedCells,
  swimlaneCellClick,
  swimlaneRenderDoneListener,
}) => {
  const {
    services: { uiSettings },
  } = useMlKibana();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const timeBuckets = useMemo(() => {
    return new TimeBuckets({
      'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  return (
    <EuiPanel paddingSize="s">
      <EuiTextAlign textAlign="right">
        <EuiPopover
          button={
            <EuiButtonIcon
              size="s"
              aria-label={i18n.translate('xpack.ml.explorer.swimlaneActions', {
                defaultMessage: 'Actions',
              })}
              color="subdued"
              iconType="boxesHorizontal"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
              }}
            />
          }
          isOpen={isMenuOpen}
          closePopover={() => {
            setIsMenuOpen(false);
          }}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel>
            <AddToDashboardControl jobIds={jobIds} swimlaneType={swimlaneType} />
          </EuiContextMenuPanel>
        </EuiPopover>
      </EuiTextAlign>

      <div>
        <MlTooltipComponent>
          {(tooltipService) => (
            <ExplorerSwimlane
              chartWidth={swimlaneContainerWidth}
              filterActive={filterActive}
              maskAll={maskAll}
              timeBuckets={timeBuckets}
              swimlaneCellClick={swimlaneCellClick}
              swimlaneData={swimlaneData}
              swimlaneType={swimlaneType}
              selection={selectedCells}
              swimlaneRenderDoneListener={swimlaneRenderDoneListener}
              tooltipService={tooltipService}
            />
          )}
        </MlTooltipComponent>
      </div>
    </EuiPanel>
  );
};
