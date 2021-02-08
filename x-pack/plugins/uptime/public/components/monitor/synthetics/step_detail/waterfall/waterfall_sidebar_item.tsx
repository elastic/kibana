/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { SidebarItem } from '../waterfall/types';
import { MiddleTruncatedText } from '../../waterfall';
import { SideBarItemHighlighter } from '../../waterfall/components/styles';
import { SIDEBAR_FILTER_MATCHES_SCREENREADER_LABEL } from '../../waterfall/components/translations';

interface SidebarItemProps {
  item: SidebarItem;
  renderFilterScreenReaderText?: boolean;
  onClick: (params: any) => void;
}

export const WaterfallSidebarItem = ({
  item,
  renderFilterScreenReaderText,
  onClick,
}: SidebarItemProps) => {
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null | HTMLAnchorElement>();
  const { status, offsetIndex, index, isHighlighted, url } = item;

  const handleSidebarClick = useCallback(() => {
    if (onClick) {
      onClick({ buttonRef, networkItemIndex: index });
    }
  }, [buttonRef, index, onClick]);

  const setRef = useCallback((ref) => setButtonRef(ref), [setButtonRef]);

  const isErrorStatusCode = (statusCode: number) => {
    const is400 = statusCode >= 400 && statusCode <= 499;
    const is500 = statusCode >= 500 && statusCode <= 599;
    const isSpecific300 = statusCode === 301 || statusCode === 307 || statusCode === 308;
    return is400 || is500 || isSpecific300;
  };

  const text = `${offsetIndex}. ${item.url}`;
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
        <MiddleTruncatedText
          text={text}
          url={url}
          ariaLabel={ariaLabel}
          onClick={handleSidebarClick}
          setButtonRef={setRef}
        />
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <MiddleTruncatedText
              text={text}
              url={url}
              ariaLabel={ariaLabel}
              onClick={handleSidebarClick}
              setButtonRef={setRef}
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
