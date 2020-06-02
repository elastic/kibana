/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup, EuiDescriptionList, EuiButtonEmpty } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { transparentize } from 'polished';

import { ExceptionListItemSchema } from '../types';
import { getDescriptionListContent } from '../helpers';
import * as i18n from '../translations';

const StyledExceptionDetails = styled(EuiFlexItem)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.95, theme.eui.euiColorPrimary)};
    padding: 16px;

    .euiDescriptionList__title.listTitle--width {
      width: 40%;
    }

    .euiDescriptionList__description.listDescription--width {
      width: 60%;
    }
  `}
`;

const ExceptionDetailsComponent = ({
  showComments,
  onCommentsClick,
  exceptionItem,
}: {
  showComments: boolean;
  exceptionItem: ExceptionListItemSchema;
  onCommentsClick: () => void;
}) => {
  const descriptionList = useMemo(() => getDescriptionListContent(exceptionItem), [exceptionItem]);

  const commentsSection = useMemo(() => {
    const { comments } = exceptionItem;
    if (comments !== null && comments && comments.length > 0) {
      return (
        <EuiButtonEmpty
          onClick={onCommentsClick}
          flush="left"
          size="xs"
          data-test-subj="exceptionsViewerItemCommentsBtn"
        >
          {!showComments
            ? i18n.COMMENTS_SHOW(comments.length)
            : i18n.COMMENTS_HIDE(comments.length)}
        </EuiButtonEmpty>
      );
    } else {
      return <></>;
    }
  }, [showComments, onCommentsClick, exceptionItem]);

  return (
    <StyledExceptionDetails grow={2}>
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem grow={1}>
          <EuiDescriptionList
            compressed
            type="column"
            listItems={descriptionList}
            titleProps={{ className: 'listTitle--width' }}
            descriptionProps={{ className: 'listDescription--width' }}
            data-test-subj="exceptionsViewerItemDetails"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{commentsSection}</EuiFlexItem>
      </EuiFlexGroup>
    </StyledExceptionDetails>
  );
};

ExceptionDetailsComponent.displayName = 'ExceptionDetailsComponent';

export const ExceptionDetails = React.memo(ExceptionDetailsComponent);

ExceptionDetails.displayName = 'ExceptionDetails';
