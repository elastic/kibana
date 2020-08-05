/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiButtonEmpty, EuiText } from '@elastic/eui';

import {
  useCanvasShareableState,
  setScrubberVisibleAction,
  setPageAction,
  setAutoplayAction,
} from '../../context';

type onSetPageNumberFn = (page: number) => void;
type onToggleScrubberFn = () => void;

interface Props {
  /**
   * The handler to invoke when the current page number is set.
   */
  onSetPageNumber: onSetPageNumberFn;

  /**
   * The handler to invoke when the scrubber visibility is toggled.
   */
  onToggleScrubber: onToggleScrubberFn;

  /**
   * The current page number.
   */
  page: number;

  /**
   * The total number of pages in the worpad.
   */
  totalPages: number;
}

/**
 * The page count and paging controls within the footer of the Shareable Canvas Workpad.
 */
export const PageControlsComponent: FC<Props> = ({
  onSetPageNumber,
  page,
  totalPages,
  onToggleScrubber,
}) => {
  const currentPage = page + 1;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" style={{ margin: '0 12px' }}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="ghost"
          data-test-subj="pageControlsPrevPage"
          onClick={() => onSetPageNumber(page - 1)}
          iconType="arrowLeft"
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="ghost"
          size="s"
          onClick={onToggleScrubber}
          data-test-subj="pageControlsCurrentPage"
        >
          <EuiText color="ghost" size="s">
            Page {currentPage}
            {totalPages > 1 ? ` of ${totalPages}` : null}
          </EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="ghost"
          data-test-subj="pageControlsNextPage"
          onClick={() => onSetPageNumber(page + 1)}
          iconType="arrowRight"
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * A store-connected container for the `PageControls` component.
 */
export const PageControls: FC<{}> = () => {
  const [{ workpad, footer, stage }, dispatch] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { isScrubberVisible } = footer;
  const { page } = stage;
  const totalPages = workpad.pages.length;

  const onToggleScrubber = () => {
    dispatch(setAutoplayAction(false));
    dispatch(setScrubberVisibleAction(!isScrubberVisible));
  };
  const onSetPageNumber = (number: number) => dispatch(setPageAction(number));

  return <PageControlsComponent {...{ onToggleScrubber, onSetPageNumber, page, totalPages }} />;
};
