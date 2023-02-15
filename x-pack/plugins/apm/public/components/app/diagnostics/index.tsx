/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTimelineItem } from '@elastic/eui';
import { EuiSplitPanel } from '@elastic/eui';
import { EuiBadge, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { useGeneratedHtmlId } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiAccordion,
  EuiPanel,
} from '@elastic/eui';
import { EuiSwitchEvent } from '@elastic/eui';
import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiAvatar } from '@elastic/eui';
import { EuiTimeline } from '@elastic/eui';
import React, { useState } from 'react';

export function Diagnostics() {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const buttonElementAccordionId = useGeneratedHtmlId({
    prefix: 'buttonElementAccordion',
  });

  // We could use the `euiPaletteColorBlind` for coloring the avatars
  // But because we're placing an icon on top of these colors
  // The `euiPaletteColorBlindBehindText` is a better choice to ensure better contrast
  const colorBlindBehindText = euiPaletteColorBlindBehindText({
    sortBy: 'natural',
  });

  const onChange1 = (e: EuiSwitchEvent) => setChecked1(e.target.checked);

  const onChange2 = (e: EuiSwitchEvent) => setChecked2(e.target.checked);

  const onChange3 = (e: EuiSwitchEvent) => setChecked3(e.target.checked);

  const phase = (
    title: string,
    checked: boolean,
    onChange: (e: EuiSwitchEvent) => void,
    avatarColor: string
  ) => (
    <EuiTimelineItem
      verticalAlign="top"
      icon={
        checked ? (
          <EuiAvatar name="Checked" iconType="check" color={avatarColor} />
        ) : (
          <EuiAvatar name="Unchecked" iconType="dot" color="subdued" />
        )
      }
    >
      <EuiSplitPanel.Outer color="transparent" hasBorder grow>
        <EuiSplitPanel.Inner color={checked ? 'transparent' : 'subdued'}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                showLabel={false}
                label={checked ? `${title} is on` : `${title} is off`}
                checked={checked}
                onChange={onChange}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner>
          <EuiText size="s" grow={false}>
            <p>
              Move data to the cold tier when you are searching it less often
              and don&apos;t need to update it. The cold tier is optimized for
              cost savings over search performance.
            </p>
          </EuiText>

          {checked && (
            <>
              <EuiSpacer />
              <EuiAccordion
                id={buttonElementAccordionId}
                buttonElement="div"
                buttonContent="Advanced settings"
              >
                <EuiPanel color="transparent">
                  Any content inside of <strong>EuiAccordion</strong> will
                  appear here.
                </EuiPanel>
              </EuiAccordion>
            </>
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiTimelineItem>
  );

  return (
    <>
      <EuiTimeline aria-label="Life cycle of data">
        <EuiTimelineItem
          verticalAlign="top"
          icon={
            <EuiAvatar
              name="Checked"
              iconType="check"
              color={colorBlindBehindText[0]}
            />
          }
        >
          <EuiSplitPanel.Outer color="transparent" hasBorder grow>
            <EuiSplitPanel.Inner>
              <EuiTitle size="s">
                <h2>
                  Hot phase <EuiBadge color="warning">Required</EuiBadge>
                </h2>
              </EuiTitle>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner>
              <EuiText grow={false} size="s">
                <p>
                  Store your most recent, most frequently-searched data in the
                  hot hot tier. The hot tier provides the best indexing and
                  search performance by using the most powerful, expensive
                  hardware.
                </p>
              </EuiText>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiTimelineItem>

        {phase('Warm phase', checked1, onChange1, colorBlindBehindText[1])}

        {phase('Cold phase', checked2, onChange2, colorBlindBehindText[2])}

        {phase('Frozen phase', checked3, onChange3, colorBlindBehindText[3])}
      </EuiTimeline>
    </>
  );
}
