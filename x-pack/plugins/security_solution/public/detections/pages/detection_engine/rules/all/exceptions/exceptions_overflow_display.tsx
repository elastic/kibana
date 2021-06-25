/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiBadgeGroup, EuiButton } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../../translations';
import { Spacer } from '../../../../../../common/components/page';
import { LinkAnchor } from '../../../../../../common/components/links';
import { getRuleDetailsUrl } from '../../../../../../common/components/link_to/redirect_to_detection_engine';
import { Rule } from '../../../../../containers/detection_engine/rules';
import { FormatUrl } from '../../../../../../common/components/link_to';

interface ExceptionOverflowDisplayProps {
  rules: Rule[];
  navigateToUrl: (url: string) => Promise<void>;
  formatUrl: FormatUrl;
}

const ExceptionOverflowWrapper = styled(EuiBadgeGroup)`
  width: 100%;
`;

const ExceptionOverflowPopoverWrapper = styled(EuiBadgeGroup)`
  max-height: 200px;
  max-width: 600px;
  overflow: auto;
`;

const ExceptionOverflowPopoverButton = styled(EuiButton)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS}
  font-weight: 500;
  height: 20px;
`;

/**
 * @param rules to display for filtering
 */
const ExceptionOverflowDisplayComponent = ({
  rules,
  navigateToUrl,
  formatUrl,
}: ExceptionOverflowDisplayProps) => {
  const [isExceptionOverflowPopoverOpen, setIsExceptionOverflowPopoverOpen] = useState(false);

  return (
    <>
      {rules.length <= 2 ? (
        <ExceptionOverflowWrapper data-test-subj="rules">
          {rules.map(({ name, id }, index: number) => (
            <Spacer key={id}>
              <LinkAnchor
                key={id}
                data-test-subj="ruleName"
                onClick={(ev: { preventDefault: () => void }) => {
                  ev.preventDefault();
                  navigateToUrl(formatUrl(getRuleDetailsUrl(id)));
                }}
                href={formatUrl(getRuleDetailsUrl(id))}
              >
                {name}
              </LinkAnchor>
              {index !== rules.length - 1 ? ', ' : ''}
            </Spacer>
          ))}
        </ExceptionOverflowWrapper>
      ) : (
        <ExceptionOverflowWrapper data-test-subj="rules">
          {rules.slice(0, 2).map(({ name, id }, index: number) => (
            <Spacer key={id}>
              <LinkAnchor
                key={id}
                data-test-subj="ruleName"
                onClick={(ev: { preventDefault: () => void }) => {
                  ev.preventDefault();
                  navigateToUrl(formatUrl(getRuleDetailsUrl(id)));
                }}
                href={formatUrl(getRuleDetailsUrl(id))}
              >
                {name}
              </LinkAnchor>
              {index !== rules.length - 1 ? ', ' : ''}
            </Spacer>
          ))}

          <EuiPopover
            ownFocus
            display="block"
            data-test-subj="rules-display-popover"
            button={
              <ExceptionOverflowPopoverButton
                size="s"
                data-test-subj={'rules-display-popover-button'}
                onClick={() => setIsExceptionOverflowPopoverOpen(!isExceptionOverflowPopoverOpen)}
              >
                {i18n.COLUMN_SEE_ALL_POPOVER}
              </ExceptionOverflowPopoverButton>
            }
            isOpen={isExceptionOverflowPopoverOpen}
            closePopover={() => setIsExceptionOverflowPopoverOpen(!isExceptionOverflowPopoverOpen)}
            repositionOnScroll
          >
            <ExceptionOverflowPopoverWrapper>
              {rules.map(({ name, id }, index: number) => (
                <Spacer key={id}>
                  <LinkAnchor
                    key={id}
                    data-test-subj="ruleName"
                    onClick={(ev: { preventDefault: () => void }) => {
                      ev.preventDefault();
                      navigateToUrl(formatUrl(getRuleDetailsUrl(id)));
                    }}
                    href={formatUrl(getRuleDetailsUrl(id))}
                  >
                    {name}
                  </LinkAnchor>
                  {index !== rules.length - 1 ? ', ' : ''}
                </Spacer>
              ))}
            </ExceptionOverflowPopoverWrapper>
          </EuiPopover>
        </ExceptionOverflowWrapper>
      )}
    </>
  );
};

export const ExceptionOverflowDisplay = React.memo(ExceptionOverflowDisplayComponent);

ExceptionOverflowDisplay.displayName = 'ExceptionOverflowDisplay';
