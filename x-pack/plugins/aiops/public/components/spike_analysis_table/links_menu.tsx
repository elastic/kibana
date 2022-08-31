/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-nocheck
// import { cloneDeep } from 'lodash';
// import moment from 'moment';
// import rison, { RisonValue } from 'rison-node';
// import { escapeKuery } from '@kbn/es-query';
import React, { FC, useMemo, useState } from 'react';
// import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
// import { APP_ID as MAPS_APP_ID } from '@kbn/maps-plugin/common';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import {
  EuiButtonIcon,
//   EuiContextMenuItem,
//   EuiContextMenuPanel,
  EuiPopover,
//   EuiProgress,
//   EuiToolTip,
} from '@elastic/eui';
import { useAiOpsKibana } from '../../kibana_context';

interface LinksMenuProps {
    changePoint: ChangePoint;
}

// fieldName, fieldValue in changePoint is what we need and set time to timerange used
export const LinksMenu: FC<LinksMenuProps> = ({ changePoint }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const onButtonClick = setPopoverOpen.bind(null, !isPopoverOpen);
  const closePopover = setPopoverOpen.bind(null, false);
  
//   const { services } = useAiOpsKibana();
//   const { timefilter, history } = services.data.query.timefilter;
  const aiOpsKibana = useAiOpsKibana();
  const {
    services: { share, data: { query: timefilter } },
  } = aiOpsKibana;

   const contextMenuItems = useMemo(() => {}, []);

  const button = (
    <EuiButtonIcon
      size="s"
      color="text"
      onClick={onButtonClick}
      iconType="gear"
      aria-label={i18n.translate('xpack.aiops.spikeAnalysisTable.linksMenu.selectActionAriaLabel', {
        defaultMessage: 'Select action for key value pair',
        // values: { time: formatHumanReadableDateTimeSeconds(props.anomaly.time) },
      })}
      data-test-subj="mlAnomaliesListRowActionsButton"
    />
  );

  return (
    <div>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        {/* <EuiContextMenuPanel items={contextMenuItems} data-test-subj="mlAnomaliesListRowActionsMenu" /> */}
      </EuiPopover>
    </div>
  );
};