/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { px, units } from '../../../../../../../style/variables';

const ToggleButtonContainer = styled.div`
  margin-top: ${px(units.half)};
  user-select: none;
`;

interface Props {
  previewHeight: number;
}

export const TruncateHeightSection: React.FC<Props> = ({
  children,
  previewHeight
}) => {
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
          maxHeight: isOpen ? 'initial' : px(previewHeight)
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
                transform: `rotate(${isOpen ? 90 : 0}deg)`
              }}
              type="arrowRight"
            />{' '}
            {isOpen
              ? i18n.translate('xpack.apm.toggleHeight.showLessButtonLabel', {
                  defaultMessage: 'Show fewer lines'
                })
              : i18n.translate('xpack.apm.toggleHeight.showMoreButtonLabel', {
                  defaultMessage: 'Show more lines'
                })}
          </EuiLink>
        </ToggleButtonContainer>
      ) : null}
    </Fragment>
  );
};
