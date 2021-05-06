/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { Fragment, ReactNode } from 'react';
import styled from 'styled-components';

import { NO_ALERT_INDEX } from '../../../../common/constants';
import * as i18n from './translations';

const DescriptionListStyled = styled(EuiDescriptionList)`
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.s}) {
    .euiDescriptionList__title {
      width: 30% !important;
    }

    .euiDescriptionList__description {
      width: 70% !important;
    }
  }
`;

DescriptionListStyled.displayName = 'DescriptionListStyled';

interface ModalInspectProps {
  closeModal: () => void;
  isShowing: boolean;
  request: string | null;
  response: string | null;
  additionalRequests?: string[] | null;
  additionalResponses?: string[] | null;
  title: string | React.ReactElement | React.ReactNode;
}

interface Request {
  index: string[];
  allowNoIndices: boolean;
  ignoreUnavailable: boolean;
  body: Record<string, unknown>;
}

interface Response {
  took: number;
  timed_out: boolean;
  _shards: Record<string, unknown>;
  hits: Record<string, unknown>;
  aggregations: Record<string, unknown>;
}

const MyEuiModal = styled(EuiModal)`
  .euiModal__flex {
    width: 60vw;
  }
  .euiCodeBlock {
    height: auto !important;
    max-width: 718px;
  }
`;

MyEuiModal.displayName = 'MyEuiModal';
const parseInspectStrings = function <T>(stringsArray: string[]): T[] {
  try {
    return stringsArray.map((objectStringify) => JSON.parse(objectStringify));
  } catch {
    return [];
  }
};

const manageStringify = (object: Record<string, unknown> | Response): string => {
  try {
    return JSON.stringify(object, null, 2);
  } catch {
    return i18n.SOMETHING_WENT_WRONG;
  }
};

export const formatIndexPatternRequested = (indices: string[] = []) => {
  if (indices.length === 1 && indices[0] === NO_ALERT_INDEX) {
    return <i>{i18n.NO_ALERT_INDEX_FOUND}</i>;
  }
  return indices.length > 0
    ? indices.filter((i) => i !== NO_ALERT_INDEX).join(', ')
    : i18n.SOMETHING_WENT_WRONG;
};

export const ModalInspectQuery = ({
  closeModal,
  isShowing = false,
  request,
  response,
  additionalRequests,
  additionalResponses,
  title,
}: ModalInspectProps) => {
  if (!isShowing || request == null || response == null) {
    return null;
  }

  const requests: string[] = [request, ...(additionalRequests != null ? additionalRequests : [])];
  const responses: string[] = [
    response,
    ...(additionalResponses != null ? additionalResponses : []),
  ];

  const inspectRequests: Request[] = parseInspectStrings(requests);
  const inspectResponses: Response[] = parseInspectStrings(responses);

  const statistics: Array<{
    title: NonNullable<ReactNode | string>;
    description: NonNullable<ReactNode | string>;
  }> = [
    {
      title: (
        <span data-test-subj="index-pattern-title">
          {i18n.INDEX_PATTERN}{' '}
          <EuiIconTip color="subdued" content={i18n.INDEX_PATTERN_DESC} type="iInCircle" />
        </span>
      ),
      description: (
        <span data-test-subj="index-pattern-description">
          {formatIndexPatternRequested(inspectRequests[0]?.index ?? [])}
        </span>
      ),
    },

    {
      title: (
        <span data-test-subj="query-time-title">
          {i18n.QUERY_TIME}{' '}
          <EuiIconTip color="subdued" content={i18n.QUERY_TIME_DESC} type="iInCircle" />
        </span>
      ),
      description: (
        <span data-test-subj="query-time-description">
          {inspectResponses[0]?.took
            ? `${numeral(inspectResponses[0].took).format('0,0')}ms`
            : i18n.SOMETHING_WENT_WRONG}
        </span>
      ),
    },
    {
      title: (
        <span data-test-subj="request-timestamp-title">
          {i18n.REQUEST_TIMESTAMP}{' '}
          <EuiIconTip color="subdued" content={i18n.REQUEST_TIMESTAMP_DESC} type="iInCircle" />
        </span>
      ),
      description: (
        <span data-test-subj="request-timestamp-description">{new Date().toISOString()}</span>
      ),
    },
  ];

  const tabs = [
    {
      id: 'statistics',
      name: 'Statistics',
      content: (
        <>
          <EuiSpacer />
          <DescriptionListStyled listItems={statistics} type="column" />
        </>
      ),
    },
    {
      id: 'request',
      name: 'Request',
      content:
        inspectRequests.length > 0 ? (
          inspectRequests.map((inspectRequest, index) => (
            <Fragment key={index}>
              <EuiSpacer />
              <EuiCodeBlock
                language="js"
                fontSize="m"
                paddingSize="m"
                color="dark"
                overflowHeight={300}
                isCopyable
              >
                {manageStringify(inspectRequest.body)}
              </EuiCodeBlock>
            </Fragment>
          ))
        ) : (
          <EuiCodeBlock>{i18n.SOMETHING_WENT_WRONG}</EuiCodeBlock>
        ),
    },
    {
      id: 'response',
      name: 'Response',
      content:
        inspectResponses.length > 0 ? (
          responses.map((responseText, index) => (
            <Fragment key={index}>
              <EuiSpacer />
              <EuiCodeBlock
                language="js"
                fontSize="m"
                paddingSize="m"
                color="dark"
                overflowHeight={300}
                isCopyable
              >
                {responseText}
              </EuiCodeBlock>
            </Fragment>
          ))
        ) : (
          <EuiCodeBlock>{i18n.SOMETHING_WENT_WRONG}</EuiCodeBlock>
        ),
    },
  ];

  return (
    <MyEuiModal onClose={closeModal} data-test-subj="modal-inspect-euiModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.INSPECT} {title}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill data-test-subj="modal-inspect-close">
          {i18n.CLOSE}
        </EuiButton>
      </EuiModalFooter>
    </MyEuiModal>
  );
};
