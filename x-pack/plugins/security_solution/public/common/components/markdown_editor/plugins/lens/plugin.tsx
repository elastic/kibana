/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';

import {
  EuiFieldText,
  EuiModal,
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
import { insertText } from '@elastic/eui/lib/components/markdown_editor/markdown_actions';
import { IndexPattern } from 'src/plugins/data/public';
import React, { useCallback, useContext, useMemo, useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import moment, { Moment } from 'moment';
import { useLocation } from 'react-router-dom';

import { SavedObjectFinderUi } from '../../../../../../../../../src/plugins/saved_objects/public';
import {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  XYState,
} from '../../../../../../../lens/public';
import { useKibana } from '../../../../lib/kibana';
import { LensMarkDownRenderer } from './processor';
import { ID } from './constants';
import * as i18n from './translations';
import { LensContext } from './context';

const ModalContainer = styled.div`
  width: ${({ theme }) => theme.eui.euiBreakpoints.m};

  .euiModalBody {
    min-height: 300px;
  }
`;

// Generate a Lens state based on some app-specific input parameters.
// `TypedLensByValueInput` can be used for type-safety - it uses the same interfaces as Lens-internal code.
function getLensAttributes(defaultIndexPattern: IndexPattern): TypedLensByValueInput['attributes'] {
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1', 'col2'],
    columns: {
      col2: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        scale: 'ratio',
        sourceField: 'Records',
      },
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: defaultIndexPattern.timeFieldName!,
      },
    },
  };

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers: [
      {
        accessors: ['col2'],
        layerId: 'layer1',
        seriesType: 'bar_stacked',
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color: undefined }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: '',
    references: [
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

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
  const context = useContext(LensContext);
  const markdownContext = useContext(EuiMarkdownContext);

  console.error('contextcontextcontext', context);

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
    if (node) {
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
  }, [lensEmbeddableAttributes, onSave, startDate, endDate, lensTitle]);

  const originatingPath = useMemo(() => {
    const commentId = context?.editorId;

    if (!commentId) {
      return `${location.pathname}${location.search}`;
    }

    return `${location.pathname}/${commentId}${location.search}`;
  }, [context?.editorId, location.pathname, location.search]);

  const handleEditInLensClick = useCallback(async () => {
    storage.set(
      'xpack.cases.commentDraft',
      JSON.stringify({
        commentId: context?.editorId,
        comment: context?.value,
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
    context?.editorId,
    context?.value,
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
        setStartDate(dateMath.parse(lensTime.from!));
        setEndDate(dateMath.parse(lensTime.to!));
      }
    }

    console.error('stoargesgeet', storage.get('xpack.cases.commentDraft'));
  }, [embeddable, storage]);

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
        <EuiModal onClose={() => setShowLensSavedObjectsModal(false)}>
          <ModalContainer>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <h1>{'Modal title'}</h1>
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <SavedObjectFinderUi
                key="searchSavedObjectFinder"
                onChoose={(savedObjectId, savedObjectType, fullName, savedObject) => {
                  console.error('apya', savedObjectId, savedObjectType, fullName, savedObject);
                  setLensEmbeddableAttributes({
                    ...savedObject.attributes,
                    references: savedObject.references,
                  });
                  setShowLensSavedObjectsModal(false);
                }}
                showFilter
                noItemsMessage={
                  'No matching lens found.'

                  // i18n.translate(
                  //   'xpack.transform.newTransform.searchSelection.notFoundLabel',
                  //   {
                  //     defaultMessage: 'No matching lens found.',
                  //   }
                  // )
                }
                savedObjectMetaData={[
                  {
                    type: 'lens',
                    getIconForSavedObject: () => 'lensApp',
                    name: 'Lens',
                    includeFields: ['*'],
                    // i18n.translate(
                    //   'xpack.transform.newTransform.searchSelection.savedObjectType.search',
                    //   {
                    //     defaultMessage: 'Lens',
                    //   }
                    // ),
                  },
                ]}
                fixedPageSize={10}
                uiSettings={uiSettings}
                savedObjects={savedObjects}
              />
            </EuiModalBody>
          </ModalContainer>
        </EuiModal>
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
      {'[title](url)'}
    </EuiCodeBlock>
  ),
  editor: function editor({ node, onSave, onCancel, ...rest }) {
    console.error('editorr', node);
    console.error('ssssssa', rest);
    return <LensEditor node={node} onClosePopover={onCancel} onSave={onSave} />;
  },
};
