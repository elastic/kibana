/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';

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
} from '@elastic/eui';
// @ts-expect-error update types
import { insertText } from '@elastic/eui/lib/components/markdown_editor/markdown_actions';
import React, { useCallback, useContext, useMemo, useRef, useEffect, useState } from 'react';
import moment, { Moment } from 'moment';
import { useLocation } from 'react-router-dom';

import { useKibana } from '../../../../lib/kibana';
import { LensMarkDownRenderer } from './processor';
import { ID } from './constants';
import * as i18n from './translations';
import { CommentEditorContext } from './context';
import { LensSavedObjectsModal } from './lens_saved_objects_modal';
import { ModalContainer } from './modal_container';
import { getLensAttributes } from './helpers';

interface LensEditorProps {
  editMode?: boolean | null;
  id?: string | null;
  title?: string | null;
  startDate?: Moment | null;
  endDate?: Moment | null;
  onClosePopover: () => void;
  onSave: (markdown: string, config: { block: boolean }) => void;
}

const LensEditorComponent: React.FC<LensEditorProps> = ({ node, onClosePopover, onSave }) => {
  const location = useLocation();
  const {
    embeddable,
    savedObjects,
    uiSettings,
    lens,
    storage,
    data: {
      indexPatterns,
      query: {
        timefilter: { timefilter },
      },
    },
    ...rest
  } = useKibana().services;

  const [lensEmbeddableAttributes, setLensEmbeddableAttributes] = useState(
    node?.attributes ?? null
  );
  const [startDate, setStartDate] = useState<Moment | null>(
    node?.startDate ? moment(node.startDate) : moment().subtract(7, 'd')
  );
  const [endDate, setEndDate] = useState<Moment | null>(
    node?.endDate ? moment(node.endDate) : moment()
  );
  const [lensTitle, setLensTitle] = useState(node?.title ?? '');
  const [showLensSavedObjectsModal, setShowLensSavedObjectsModal] = useState(false);
  const commentEditorContext = useContext(CommentEditorContext);
  const markdownContext = useContext(EuiMarkdownContext);

  console.error('contextcontextcontext', commentEditorContext);

  console.error('rest', timefilter.getTime(), rest);

  const handleLensDateChange = useCallback((data) => {
    if (data.range?.length === 2) {
      setStartDate(moment(data.range[0]));
      setEndDate(moment(data.range[1]));
    }
  }, []);

  const handleTitleChange = useCallback((e) => {
    setLensTitle(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    let draftComment;
    if (storage.get('xpack.cases.commentDraft')) {
      try {
        draftComment = JSON.parse(storage.get('xpack.cases.commentDraft'));
      } catch (e) {}
    }

    if (node) {
      markdownContext.replaceNode(
        draftComment.position,
        `!{lens${JSON.stringify({
          startDate,
          endDate,
          title: lensTitle,
          attributes: lensEmbeddableAttributes,
        })}}`
      );
      onClosePopover();
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
    onClosePopover,
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
          from: lensEmbeddableAttributes ? startDate : 'now-5d',
          to: lensEmbeddableAttributes ? endDate : 'now',
          mode: startDate ? 'absolute' : 'relative',
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

  useEffect(() => {
    const incomingEmbeddablePackage = embeddable
      .getStateTransfer()
      .getIncomingEmbeddablePackage('securitySolution:case', true);

    if (
      incomingEmbeddablePackage?.type === 'lens' &&
      incomingEmbeddablePackage?.input?.attributes
    ) {
      setLensEmbeddableAttributes(incomingEmbeddablePackage?.input.attributes);
      const lensTime = timefilter.getTime();
      if (lensTime?.from && lensTime?.to) {
        setStartDate(dateMath.parse(lensTime.from)!);
        setEndDate(dateMath.parse(lensTime.to)!);
      }
    }

    let draftComment;
    if (storage.get('xpack.cases.commentDraft')) {
      try {
        draftComment = JSON.parse(storage.get('xpack.cases.commentDraft'));
      } catch (e) {}
    }

    if (draftComment.title) {
      setLensTitle(draftComment.title);
    }

    console.error('stoargesgeet', storage.get('xpack.cases.commentDraft'));
  }, [embeddable, storage, timefilter]);

  console.error('insertText', insertText);

  console.error('markdownContext', markdownContext);

  console.error('lensEmbeddableAttributes', lensEmbeddableAttributes);

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
                  isDisabled={!lens.canUseEditor() || lensEmbeddableAttributes === null}
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
            startDate={startDate?.format()}
            endDate={endDate?.format()}
            onBrushEnd={handleLensDateChange}
            viewMode={false}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClosePopover}>{'Cancel'}</EuiButtonEmpty>
          <EuiButton onClick={handleAdd} fill disabled={!lensEmbeddableAttributes || !lensTitle}>
            {'Add to a Case'}
          </EuiButton>
        </EuiModalFooter>
      </ModalContainer>
      {showLensSavedObjectsModal ? (
        <LensSavedObjectsModal
          onClose={() => setShowLensSavedObjectsModal(false)}
          onChoose={(savedObjectId, savedObjectType, fullName, savedObject) => {
            console.error('apya', savedObjectId, savedObjectType, fullName, savedObject);
            setLensEmbeddableAttributes({
              ...savedObject.attributes,
              references: savedObject.references,
            });
            setShowLensSavedObjectsModal(false);
          }}
        />
      ) : null}
    </>
  );
};

const LensEditor = React.memo(LensEditorComponent);

export const plugin: EuiMarkdownEditorUiPlugin = {
  name: ID,
  button: {
    label: i18n.INSERT_LENS,
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'{lens!{<config>}}'}
    </EuiCodeBlock>
  ),
  editor: function editor({ node, onSave, onCancel, ...rest }) {
    return <LensEditor node={node} onClosePopover={onCancel} onSave={onSave} />;
  },
};
