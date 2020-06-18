/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { getOr } from 'lodash/fp';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiModalBody,
  EuiOverlayMask,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiTextArea,
  EuiCheckbox,
  EuiCodeBlock,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAvatar,
  EuiFormRow,
  EuiPanel,
} from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui/lib/services';
import { Comment } from '../../../../../lists/common/schemas';
import * as i18n from './translations';
import { TimelineNonEcsData, Ecs } from '../../../graphql/types';
import { TimelineDetailsQuery } from '../../../timelines/containers/details';
import { useCurrentUser, useKibana } from '../../../common/lib/kibana';
import {
  errorToToaster,
  displaySuccessToast,
  useStateToaster,
} from '../../../common/components/toasters';
import {
  usePersistExceptionList,
  usePersistExceptionItem,
} from '../../../../../lists/public';
import { ExceptionBuilder } from '../../../common/components/exception_builder';

// TODO: What's the different between ECS data and Non ECS data
interface AddExceptionModalProps {
  modalType?: 'endpoint' | 'detection';
  eventData: TimelineNonEcsData[];
  eventEcsData: Ecs;
  onCancel: () => void;
  onConfirm: () => void;
}

function generateExceptionList() {
  return {
    list_id: 'endpoint_list',
    _tags: ['endpoint', 'process', 'malware', 'os:linux'],
    tags: ['user added string for a tag', 'malware'],
    type: 'endpoint',
    description: 'This is a sample endpoint type exception',
    name: 'Sample Endpoint Exception List',
  };
}

function generateExceptionItem(comment: string) {
  return {
    list_id: 'endpoint_list',
    item_id: htmlIdGenerator(),
    _tags: ['endpoint', 'process', 'malware', 'os:linux'],
    tags: ['user added string for a tag', 'malware'],
    type: 'simple',
    description: 'This is a sample endpoint type exception',
    name: 'Sample Endpoint Exception List',
    comment: [comment],
    entries: [
      {
        field: 'actingProcess.file.signer',
        operator: 'included',
        match: 'Elastic, N.V.',
        match_any: undefined,
      },
      {
        field: 'event.category',
        operator: 'included',
        match_any: ['process', 'malware'],
        match: undefined,
      },
    ],
  };
}

const Avatar = styled(EuiAvatar)`
  ${({ theme }) => css`
    margin-right: ${theme.eui.euiSizeM};
  `}
`;

const Modal = styled(EuiModal)`
  ${({ theme }) => css`
    width: ${theme.eui.euiBreakpoints.m};
  `}
`;

// TODO: truncate subtitle
const ModalHeader = styled(EuiModalHeader)`
  ${({ theme }) => css`
    flex-direction: column;
    align-items: flex-start;
  `}
`;

const ModalBodySection = styled.section`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};

    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

// TODO: move to common?
const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};

// TODO: add comment to exception items
// TODO: for endpoint exceptions add OS to each entry in the exception items
export const AddExceptionModal = memo(function AddExceptionModal({
  modalType,
  eventData,
  eventEcsData,
  onCancel,
  onConfirm,
}: AddExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const [shouldCloseAlert, setShouldCloseAlert] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState([]);
  const currentUser = useCurrentUser();
  const [, dispatchToaster] = useStateToaster();
  const onError = useCallback((error) => {
    errorToToaster({ title: i18n.ADD_EXCEPTION_ERROR, error, dispatchToaster });
    onCancel();
  }, []);
  const onSuccess = useCallback(() => {
    displaySuccessToast(i18n.ADD_EXCEPTION_SUCCESS, dispatchToaster);
    onConfirm();
  }, []);

  const [
    { isLoading: exceptionsIsLoading, isSaved: exceptionsIsSaved },
    setExceptionList,
  ] = usePersistExceptionList({ onError, http });

  const [
    { isLoading: exceptionItemPersistIsLoading, isSaved: exceptionItemPersistIsSaved },
    setExceptionItem,
  ] = usePersistExceptionItem({ onError, onSuccess, http });

  // TODO: file hash is not present in data from generator
  // TODO: hash is an array
  // TODO: code_signature is missing
  // TODO: check autocomplete or editing of text in builder
  const endpointExceptionItems = useCallback(() => {
    if (modalType === 'endpoint') {
      return [
        {
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              match: getMappedNonEcsValue({ data: eventData, fieldName: 'file.path' }) ?? '',
            },
          ],
        },
        {
          entries: [
            {
              field: 'file.code_signature.signer',
              operator: 'included',
              match:
                getMappedNonEcsValue({
                  data: eventData,
                  fieldName: 'file.code_signature.signer',
                }) ?? '',
            },
            {
              field: 'file.code_signature.trusted',
              operator: 'included',
              match:
                getMappedNonEcsValue({
                  data: eventData,
                  fieldName: 'file.code_signature.trusted',
                }) ?? '',
            },
          ],
        },
        {
          entries: [
            {
              field: 'file.hash.sha1',
              operator: 'included',
              match: getMappedNonEcsValue({ data: eventData, fieldName: 'file.hash.sha1' }) ?? '',
            },
          ],
        },
        {
          entries: [
            {
              field: 'event.category',
              operator: 'included',
              match_any:
                getMappedNonEcsValue({ data: eventData, fieldName: 'event.category' }) ?? [],
            },
          ],
        },
      ];
    } else {
      return [];
    }
  }, [eventData, eventEcsData]);

  const onCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setComment(event.target.value);
    },
    [setComment]
  );

  const onCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShouldCloseAlert(event.currentTarget.checked);
    },
    [setShouldCloseAlert]
  );

  const exceptionItemToAdd = useMemo(() => {
    return generateExceptionItem(comment);
  }, [comment]);

  const enrichWithComments = useCallback(
    (exceptions: []) => {
      const newComment: Comment = {
        comment,
        created_by: currentUser,
        created_at: new Date(),
      };
      for (const exception of exceptions) {
        exception.comments = [newComment];
      }
    },
    [comment]
  );

  const enrichWithOS = useCallback(
    (exceptions) => {
      const name = 'windows';
      // TODO: get this working and use the helper
      // const {
      //   value: [name],
      // } = eventData.find((data) => data.field === 'host.os.family');
      const osField = `os:${name}`;
      for (const exception of exceptions) {
        if (exception._tags.includes(osField) === false) {
          exception._tags.push(osField);
        }
      }
    },
    [eventData]
  );

  const enrichExceptionItems = useCallback(() => {
    enrichWithComments(exceptionItemsToAdd);
    if (modalType === 'endpoint') {
      enrichWithOS(exceptionItemsToAdd);
    }
  }, [exceptionItemsToAdd]);

  const onAddExceptionConfirm = useCallback(() => {
    enrichExceptionItems();
    console.log(exceptionItemsToAdd);
    // TODO: Create API hook for persisting and closing
    // TODO: insert OS tag into entries before persisting for endpoint exceptions
    // setExceptionItem(exceptionItemToAdd);
  }, [exceptionItemToAdd]);

  const ruleName = useMemo(() => {
    return getMappedNonEcsValue({ data: eventData, fieldName: 'signal.rule.name' }) ?? '';
  }, [getMappedNonEcsValue]);

  return (
    <EuiOverlayMask>
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>{i18n.ADD_EXCEPTION}</EuiModalHeaderTitle>
          <div className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </div>
        </ModalHeader>

        <ModalBodySection className="builder-section">
          {/* <EuiCodeBlock language="json">{JSON.stringify(exceptionItemToAdd, null, 2)}</EuiCodeBlock>*/}
          <ExceptionBuilder
            exceptionItems={endpointExceptionItems()}
            listId="endpoint_list"
            listType="endpoint"
            dataTestSubj="alert-exception-builder"
            idAria="alert-exception-builder"
            onChange={setExceptionItemsToAdd}
          />
          <EuiSpacer />
          <EuiFlexGroup gutterSize={'none'}>
            <EuiFlexItem grow={false}>
              <Avatar name={currentUser != null ? currentUser.fullName ?? '' : ''} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextArea
                placeholder="Add a new comment..."
                aria-label="Use aria labels when no actual label is in use"
                value={comment}
                onChange={onCommentChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </ModalBodySection>
        <EuiHorizontalRule />
        <ModalBodySection>
          <EuiFormRow>
            <EuiCheckbox
              id="close-alert-on-add-add-exception-checkbox"
              label="Close this alert"
              checked={shouldCloseAlert}
              onChange={onCloseAlertCheckboxChange}
            />
          </EuiFormRow>
        </ModalBodySection>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

          <EuiButton onClick={onAddExceptionConfirm} isLoading={exceptionItemPersistIsLoading} fill>
            {i18n.ADD_EXCEPTION}
          </EuiButton>
        </EuiModalFooter>
      </Modal>
    </EuiOverlayMask>
  );
});
