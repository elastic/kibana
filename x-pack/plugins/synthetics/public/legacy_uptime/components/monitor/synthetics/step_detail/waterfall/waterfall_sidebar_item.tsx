/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefObject, useMemo, useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { SidebarItem } from './types';
import { MiddleTruncatedText } from '../../waterfall';
import { SideBarItemHighlighter } from '../../waterfall/components/styles';
import { SIDEBAR_FILTER_MATCHES_SCREENREADER_LABEL } from '../../waterfall/components/translations';
import { OnSidebarClick } from '../../waterfall/components/use_flyout';

interface SidebarItemProps {
  item: SidebarItem;
  renderFilterScreenReaderText?: boolean;
  onClick?: OnSidebarClick;
  highestIndex: number;
}

export const WaterfallSidebarItem = ({
  item,
  highestIndex,
  renderFilterScreenReaderText,
  onClick,
}: SidebarItemProps) => {
  const [buttonRef, setButtonRef] = useState<RefObject<HTMLButtonElement | null>>();
  const { status, offsetIndex, index, isHighlighted, url } = item;

  const handleSidebarClick = useMemo(() => {
    if (onClick) {
      return () => onClick({ buttonRef, networkItemIndex: index });
    }
  }, [buttonRef, index, onClick]);

  const setRef = useCallback((ref) => setButtonRef(ref), [setButtonRef]);

  const isErrorStatusCode = (statusCode: number) => {
    const is400 = statusCode >= 400 && statusCode <= 499;
    const is500 = statusCode >= 500 && statusCode <= 599;
    const isSpecific300 = statusCode === 301 || statusCode === 307 || statusCode === 308;
    return is400 || is500 || isSpecific300;
  };

  const text = item.url;

  const ariaLabel = `${
    isHighlighted && renderFilterScreenReaderText
      ? `${SIDEBAR_FILTER_MATCHES_SCREENREADER_LABEL} `
      : ''
  }${text}`;

  return (
    <SideBarItemHighlighter
      isHighlighted={isHighlighted}
      data-test-subj={isHighlighted ? 'sideBarHighlightedItem' : 'sideBarDimmedItem'}
    >
      {!status || !isErrorStatusCode(status) ? (
        <EuiFlexGroup>
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <MiddleTruncatedText
              index={offsetIndex}
              text={text}
              url={url}
              ariaLabel={ariaLabel}
              onClick={handleSidebarClick}
              setButtonRef={setRef}
              highestIndex={highestIndex}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <MiddleTruncatedText
              index={offsetIndex}
              text={text}
              url={url}
              ariaLabel={ariaLabel}
              onClick={handleSidebarClick}
              setButtonRef={setRef}
              highestIndex={highestIndex}
            />
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiBadge color="danger">{status}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </SideBarItemHighlighter>
  );
};
