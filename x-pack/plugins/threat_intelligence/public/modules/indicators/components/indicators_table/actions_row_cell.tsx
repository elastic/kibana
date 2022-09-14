/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, VFC } from 'react';
import { InvestigateInTimelineButtonIcon } from '../../../timeline/components/investigate_in_timeline_button_icon';
import { Indicator } from '../../../../../common/types/indicator';
import { OpenIndicatorFlyoutButton } from '../open_indicator_flyout_button/open_indicator_flyout_button';
import { IndicatorsTableContext } from './context';
import { useStyles } from './styles';

const INVESTIGATE_TEST_ID = 'tiIndicatorTableInvestigateInTimelineButtonIcon';

export const ActionsRowCell: VFC<{ indicator: Indicator }> = ({ indicator }) => {
  const styles = useStyles();

  const indicatorTableContext = useContext(IndicatorsTableContext);

  if (!indicatorTableContext) {
    throw new Error(`indicatorTableContext has to be defined`);
  }

  const { setExpanded, expanded } = indicatorTableContext;

  return (
    <div css={styles.rowActionsDiv}>
      <OpenIndicatorFlyoutButton
        indicator={indicator}
        onOpen={setExpanded}
        isOpen={Boolean(expanded && expanded._id === indicator._id)}
      />
      <InvestigateInTimelineButtonIcon data={indicator} data-test-subj={INVESTIGATE_TEST_ID} />
    </div>
  );
};
