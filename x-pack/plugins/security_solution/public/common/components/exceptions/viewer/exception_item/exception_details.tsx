/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiDescriptionList,
  EuiButtonEmpty,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import React, { useMemo, Fragment } from 'react';
import styled, { css } from 'styled-components';

import { DescriptionListItem } from '../../types';
import { getDescriptionListContent } from '../../helpers';
import * as i18n from '../../translations';
import { ExceptionListItemSchema } from '../../../../../../public/lists_plugin_deps';

const MyExceptionDetails = styled(EuiFlexItem)`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorLightestShade};
    padding: ${theme.eui.euiSize};
  `}
`;

const MyDescriptionListTitle = styled(EuiDescriptionListTitle)`
  width: 40%;
`;

const MyDescriptionListDescription = styled(EuiDescriptionListDescription)`
  width: 60%;
`;

const ExceptionDetailsComponent = ({
  showComments,
  onCommentsClick,
  exceptionItem,
}: {
  showComments: boolean;
  exceptionItem: ExceptionListItemSchema;
  onCommentsClick: () => void;
}): JSX.Element => {
  const descriptionListItems = useMemo(
    (): DescriptionListItem[] => getDescriptionListContent(exceptionItem),
    [exceptionItem]
  );

  const commentsSection = useMemo((): JSX.Element => {
    const { comments } = exceptionItem;
    if (comments.length > 0) {
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
    <MyExceptionDetails grow={2}>
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem grow={1}>
          <EuiDescriptionList compressed type="column" data-test-subj="exceptionsViewerItemDetails">
            {descriptionListItems.map((item) => (
              <Fragment key={`${item.title}`}>
                <MyDescriptionListTitle>{item.title}</MyDescriptionListTitle>
                <MyDescriptionListDescription>{item.description}</MyDescriptionListDescription>
              </Fragment>
            ))}
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{commentsSection}</EuiFlexItem>
      </EuiFlexGroup>
    </MyExceptionDetails>
  );
};

ExceptionDetailsComponent.displayName = 'ExceptionDetailsComponent';

export const ExceptionDetails = React.memo(ExceptionDetailsComponent);

ExceptionDetails.displayName = 'ExceptionDetails';
