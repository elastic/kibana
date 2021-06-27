/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';

import {
  EuiFieldText,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiMarkdownEditorUiPlugin,
  EuiMarkdownContext,
  EuiCodeBlock,
  EuiSpacer,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiMarkdownAstNodePosition,
} from '@elastic/eui';
import React, { useCallback, useContext, useMemo, useEffect, useState } from 'react';
import moment from 'moment';
import { useLocation } from 'react-router-dom';

import type { TypedLensByValueInput } from '../../../../../../../lens/public';
import { useKibana } from '../../../../lib/kibana';
import { LensMarkDownRenderer } from './processor';
import { ID } from './constants';
import * as i18n from './translations';
import { CommentEditorContext } from './context';
import { LensSavedObjectsModal } from './lens_saved_objects_modal';
import { ModalContainer } from './modal_container';
import { getLensAttributes } from './helpers';
import type {
  EmbeddablePackageState,
  EmbeddableInput,
} from '../../../../../../../../../src/plugins/embeddable/public';

type LensIncomingEmbeddablePackage = Omit<EmbeddablePackageState, 'input'> & {
  input: Omit<EmbeddableInput, 'id'> & {
    id: string | undefined;
    attributes: TypedLensByValueInput['attributes'];
  };
};

type LensEuiMarkdownEditorUiPlugin = EuiMarkdownEditorUiPlugin<{
  title: string;
  startDate: string;
  endDate: string;
  position: EuiMarkdownAstNodePosition;
  attributes: TypedLensByValueInput['attributes'];
}>;

const LensEditorComponent: LensEuiMarkdownEditorUiPlugin['editor'] = ({
  node,
  onCancel,
  onSave,
}) => {
  const srvics = useKibana();
  const location = useLocation();
  const {
    application: { currentAppId$ },
    embeddable,
    lens,
    storage,
    data: {
      indexPatterns,
      query: {
        timefilter: { timefilter },
      },
    },
  } = useKibana().services;

  const currentAppId = useRef(null);

  const [editMode, setEditMode] = useState(!!node);
  const [lensEmbeddableAttributes, setLensEmbeddableAttributes] = useState(
    node?.attributes ?? null
  );
  const [startDate, setStartDate] = useState<string>(
    node?.startDate ? moment(node.startDate).format() : 'now-7d'
  );
  const [endDate, setEndDate] = useState<string>(
    node?.endDate ? moment(node.endDate).format() : 'now'
  );
  const [lensTitle, setLensTitle] = useState(node?.title ?? '');
  const [showLensSavedObjectsModal, setShowLensSavedObjectsModal] = useState(false);
  const commentEditorContext = useContext(CommentEditorContext);
  const markdownContext = useContext(EuiMarkdownContext);

  // console.error('contextcontextcontext', commentEditorContext);

  const handleTitleChange = useCallback((e) => {
    setLensTitle(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    let draftComment;
    if (storage.get('xpack.cases.commentDraft')) {
      try {
        draftComment = JSON.parse(storage.get('xpack.cases.commentDraft'));
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }

    if (!node && draftComment) {
      markdownContext.replaceNode(
        draftComment.position,
        `!{lens${JSON.stringify({
          startDate,
          endDate,
          title: lensTitle,
          attributes: lensEmbeddableAttributes,
        })}}`
      );
      onCancel();
      return;
    }

    if (lensEmbeddableAttributes) {
      onSave(
        `!{lens${JSON.stringify({
          startDate,
          endDate,
          title: lensTitle,
          attributes: lensEmbeddableAttributes,
        })}}`,
        {
          block: true,
        }
      );
    }
  }, [
    storage,
    node,
    lensEmbeddableAttributes,
    markdownContext,
    onCancel,
    onSave,
    startDate,
    endDate,
    lensTitle,
  ]);

  const originatingPath = useMemo(() => `${location.pathname}${location.search}`, [
    location.pathname,
    location.search,
  ]);

  const handleEditInLensClick = useCallback(async () => {
    storage.set(
      'xpack.cases.commentDraft',
      JSON.stringify({
        commentId: commentEditorContext?.editorId,
        comment: commentEditorContext?.value,
        position: node?.position,
        title: lensTitle,
      })
    );

    lens?.navigateToPrefilledEditor(
      {
        id: '',
        timeRange: {
          from: (lensEmbeddableAttributes && startDate) ?? 'now-5d',
          to: (lensEmbeddableAttributes && endDate) ?? 'now',
          mode: lensEmbeddableAttributes ? 'absolute' : 'relative',
        },
        attributes: lensEmbeddableAttributes ?? getLensAttributes(await indexPatterns.getDefault()),
      },
      {
        originatingApp: 'securitySolution:case',
        originatingPath,
      }
    );
  }, [
    storage,
    commentEditorContext?.editorId,
    commentEditorContext?.value,
    node?.position,
    lensTitle,
    lens,
    lensEmbeddableAttributes,
    startDate,
    endDate,
    indexPatterns,
    originatingPath,
  ]);

  const handleChooseLensSO = useCallback(
    (savedObjectId, savedObjectType, fullName, savedObject) => {
      console.error('apya', savedObjectId, savedObjectType, fullName, savedObject);
      setLensEmbeddableAttributes({
        ...savedObject.attributes,
        title: '',
        references: savedObject.references,
      });
      setShowLensSavedObjectsModal(false);
    },
    []
  );

  const handleCloseLensSOModal = useCallback(() => setShowLensSavedObjectsModal(false), []);

  useEffect(() => {
    const incomingEmbeddablePackage = embeddable
      .getStateTransfer()
      .getIncomingEmbeddablePackage('securitySolution:case', true) as LensIncomingEmbeddablePackage;

    if (
      incomingEmbeddablePackage?.type === 'lens' &&
      incomingEmbeddablePackage?.input?.attributes
    ) {
      setLensEmbeddableAttributes(incomingEmbeddablePackage?.input.attributes);
      const lensTime = timefilter.getTime();
      if (lensTime?.from && lensTime?.to) {
        setStartDate(lensTime.from);
        setEndDate(lensTime.to);
      }
    }

    let draftComment;
    if (storage.get('xpack.cases.commentDraft')) {
      try {
        draftComment = JSON.parse(storage.get('xpack.cases.commentDraft'));
        if (draftComment.title) {
          setLensTitle(draftComment.title);
        }
        setEditMode(true);
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }

    // console.error('stoargesgeet', storage.get('xpack.cases.commentDraft'));
  }, [embeddable, storage, timefilter]);

  useEffect(() => {
    const getCurrentAppId = async () => {
      const appId = await currentAppId$.pipe(first()).toPromise();
      currentAppId.current = appId;
    };
    getCurrentAppId();
  }, [currentAppId$]);

  // console.error('markdownContext', markdownContext);

  // console.error('lensEmbeddableAttributes', lensEmbeddableAttributes);

  return (
    <>
      <ModalContainer>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {node ? 'Edit Lens visualization' : 'Add Lens visualization'}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                onClick={handleEditInLensClick}
                color="primary"
                size="m"
                iconType="lensApp"
                fill
              >
                {'Create visualization'}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                color="text"
                size="m"
                iconType="folderOpen"
                onClick={() => setShowLensSavedObjectsModal(true)}
              >
                {'Add from library'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {lensEmbeddableAttributes ? (
            <EuiFlexGroup justifyContent="flexEnd" alignItems="flexEnd">
              <EuiFlexItem>
                <EuiFormRow label="Title">
                  <EuiFieldText
                    placeholder="Placeholder text"
                    value={lensTitle}
                    onChange={handleTitleChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="lensApp"
                  fullWidth={false}
                  isDisabled={!lens?.canUseEditor() || lensEmbeddableAttributes === null}
                  onClick={handleEditInLensClick}
                >
                  {`Edit in Lens`}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          <EuiSpacer />
          <LensMarkDownRenderer
            attributes={lensEmbeddableAttributes}
            startDate={startDate}
            endDate={endDate}
            viewMode={false}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{'Cancel'}</EuiButtonEmpty>
          <EuiButton onClick={handleAdd} fill disabled={!lensEmbeddableAttributes || !lensTitle}>
            {editMode ? 'Update' : 'Add to a Case'}
          </EuiButton>
        </EuiModalFooter>
      </ModalContainer>
      {showLensSavedObjectsModal ? (
        <LensSavedObjectsModal onClose={handleCloseLensSOModal} onChoose={handleChooseLensSO} />
      ) : null}
    </>
  );
};

export const LensEditor = React.memo(LensEditorComponent);

export const plugin: LensEuiMarkdownEditorUiPlugin = {
  name: ID,
  button: {
    label: i18n.INSERT_LENS,
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'!{lens<config>}'}
    </EuiCodeBlock>
  ),
  editor: LensEditor,
};
