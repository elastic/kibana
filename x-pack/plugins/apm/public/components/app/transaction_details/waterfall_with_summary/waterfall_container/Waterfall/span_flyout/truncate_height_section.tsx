/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';

const ToggleButtonContainer = euiStyled.div`
  margin-top: ${({ theme }) => theme.eui.euiSizeS}
  user-select: none;
`;

interface Props {
  children: ReactNode;
  previewHeight: number;
}

export function TruncateHeightSection({ children, previewHeight }: Props) {
  const contentContainerEl = useRef<HTMLDivElement>(null);

  const [showToggle, setShowToggle] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (contentContainerEl.current) {
      const shouldShow =
        contentContainerEl.current.scrollHeight > previewHeight;
      setShowToggle(shouldShow);
    }
  }, [children, previewHeight]);

  return (
    <Fragment>
      <div
        ref={contentContainerEl}
        style={{
          overflow: 'hidden',
          maxHeight: isOpen ? 'initial' : previewHeight,
        }}
      >
        {children}
      </div>
      {showToggle ? (
        <ToggleButtonContainer>
          <EuiLink
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          >
            <EuiIcon
              style={{
                transition: 'transform 0.1s',
                transform: `rotate(${isOpen ? 90 : 0}deg)`,
              }}
              type="arrowRight"
            />{' '}
            {isOpen
              ? i18n.translate('xpack.apm.toggleHeight.showLessButtonLabel', {
                  defaultMessage: 'Show fewer lines',
                })
              : i18n.translate('xpack.apm.toggleHeight.showMoreButtonLabel', {
                  defaultMessage: 'Show more lines',
                })}
          </EuiLink>
        </ToggleButtonContainer>
      ) : null}
    </Fragment>
  );
}
