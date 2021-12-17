/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  htmlIdGenerator,
} from '@elastic/eui';

import type { Datatable } from '../../../../../../src/plugins/expressions/public';
import { TooltipWrapper } from '../../shared_components';
import { DragDropBuckets, NewBucketButton } from '../operations/definitions/shared_components';
import './terms_list_panel.scss';

const generateId = htmlIdGenerator();

const OTHER_VALUE = '__other__';
const EMPTY_VALUE = '';

export function getTopTerms(availableTerms: string[], limit: number) {
  return availableTerms.filter((t) => t !== OTHER_VALUE && t !== EMPTY_VALUE).slice(0, limit);
}

export function getTermsList(table: Datatable | undefined, columnId: string): string[] {
  if (!table) {
    return [];
  }
  return [
    ...table.rows.reduce<Set<string>>((termsSet, row) => {
      if (row[columnId] != null) {
        termsSet.add(row[columnId]);
      }

      return termsSet;
    }, new Set()),
  ];
}

interface TermItem {
  label: string;
  value: string;
  id: string;
  isNew: boolean;
}

function getSafeLabel(term: string) {
  if (term === OTHER_VALUE) {
    return i18n.translate('xpack.lens.indexPattern.otherDocsLabel', {
      defaultMessage: 'Other',
    });
  }
  if (term === EMPTY_VALUE) {
    return i18n.translate('xpack.lens.indexPattern.emptyLabel', {
      defaultMessage: '(empty)',
    });
  }
  return term;
}

export const TermsList = ({
  termsList,
  availableTerms,
  setTermsList,
  limit,
}: {
  limit: number;
  termsList: string[];
  availableTerms: string[];
  setTermsList: (newTerms: string[]) => void;
}) => {
  const [localTerms, setLocalTerms] = useState<TermItem[]>(
    termsList.map((term) => ({
      label: getSafeLabel(term),
      value: term,
      id: generateId(),
      isNew: false,
    }))
  );

  const updateTerms = (updatedTerms: TermItem[]) => {
    // do not set internal id parameter into saved object
    // TODO: remove duplicates
    setTermsList(
      updatedTerms.filter(({ isNew }) => !isNew).map(({ label, value }) => value ?? label)
    );
    setLocalTerms(updatedTerms);
  };

  const onAddTerm = () => {
    const newTermId = generateId();

    updateTerms([
      ...localTerms,
      {
        label: EMPTY_VALUE,
        value: EMPTY_VALUE,
        id: newTermId,
        isNew: true,
      },
    ]);
  };
  const onRemoveTerm = (id: string) => updateTerms(localTerms.filter((term) => term.id !== id));

  const onChangeValue = (id: string, term: { label: string; value?: string }) =>
    updateTerms(
      localTerms.map((localTerm) =>
        localTerm.id === id
          ? {
              ...localTerm,
              ...(term?.value == null ? { ...term, value: term.label } : term),
              isNew: false,
            }
          : localTerm
      )
    );

  const optionsList = [...availableTerms.map((t) => ({ label: getSafeLabel(t), value: t }))];
  if (!availableTerms.some((t) => t === OTHER_VALUE)) {
    optionsList.push({ label: getSafeLabel(OTHER_VALUE), value: OTHER_VALUE });
  }
  if (!availableTerms.some((t) => t === EMPTY_VALUE)) {
    optionsList.push({ label: getSafeLabel(EMPTY_VALUE), value: EMPTY_VALUE });
  }

  return (
    <div className="lnsTermsPanel__section lnsTermsPanel__section--shaded">
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.palettePicker.label', {
          defaultMessage: 'List of terms to prioritize',
        })}
      >
        <>
          <DragDropBuckets
            onDragEnd={updateTerms}
            onDragStart={() => {}}
            droppableId="TERMS_DROPPABLE_AREA"
            items={localTerms}
          >
            {localTerms?.map((term: TermItem, idx: number) => {
              const existingIndex = localTerms
                .filter((t) => t !== term)
                .findIndex(({ label }) => label?.trim() === term.label?.trim());
              const isInvalid =
                (!term.label?.trim() && !term.isNew) ||
                (existingIndex !== -1 && existingIndex < idx);

              return (
                <EuiDraggable
                  style={{ marginBottom: 4 }}
                  spacing="none"
                  index={idx}
                  draggableId={term.label || 'newField'}
                  key={term.id}
                  disableInteractiveElementBlocking
                >
                  {(provided) => (
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          size="s"
                          color={isInvalid ? 'danger' : 'subdued'}
                          type={isInvalid ? 'alert' : 'grab'}
                          title={
                            isInvalid
                              ? i18n.translate('xpack.lens.indexPattern.terms.invalid', {
                                  defaultMessage: 'The current term is not valid',
                                })
                              : i18n.translate('xpack.lens.indexPattern.terms.dragToReorder', {
                                  defaultMessage: 'Drag to reorder',
                                })
                          }
                          data-test-subj={`indexPattern-terms-dragToReorder-${idx}`}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                        <EuiComboBox
                          aria-label={term.label}
                          placeholder={i18n.translate(
                            'xpack.lens.indexPattern.terms.selectOrTypeTerm',
                            {
                              defaultMessage: 'Select or type a term',
                            }
                          )}
                          isInvalid={isInvalid}
                          singleSelection={{ asPlainText: true }}
                          options={optionsList}
                          selectedOptions={[term]}
                          onChange={(choices) => {
                            onChangeValue(
                              term.id,
                              choices[0] ?? { label: getSafeLabel(EMPTY_VALUE), value: EMPTY_VALUE }
                            );
                          }}
                          onCreateOption={(newOption) => {
                            onChangeValue(term.id, {
                              label: getSafeLabel(newOption),
                              value: newOption,
                            });
                          }}
                          fullWidth
                          compressed
                          isClearable={false}
                          prepend={`${idx + 1}.`}
                          autoFocus={term.isNew}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <TooltipWrapper
                          tooltipContent={i18n.translate(
                            'xpack.lens.indexPattern.terms.deleteButtonDisabled',
                            {
                              defaultMessage:
                                'This function requires a minimum of one term defined',
                            }
                          )}
                          condition={localTerms.length < 2}
                        >
                          <EuiButtonIcon
                            iconType="trash"
                            color="danger"
                            aria-label={i18n.translate(
                              'xpack.lens.indexPattern.terms.deleteButtonAriaLabel',
                              {
                                defaultMessage: 'Delete',
                              }
                            )}
                            title={i18n.translate(
                              'xpack.lens.indexPattern.terms.deleteButtonLabel',
                              {
                                defaultMessage: 'Delete',
                              }
                            )}
                            onClick={() => {
                              onRemoveTerm(term.id);
                            }}
                            data-test-subj={`indexPattern-terms-removeField-${idx}`}
                            isDisabled={localTerms.length < 2}
                          />
                        </TooltipWrapper>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </EuiDraggable>
              );
            })}
          </DragDropBuckets>
          <NewBucketButton
            onClick={() => {
              onAddTerm();
            }}
            label={i18n.translate('xpack.lens.indexPattern.addSortOverrideTerm', {
              defaultMessage: 'Add a term',
            })}
            isDisabled={localTerms.length >= limit}
          />
        </>
      </EuiFormRow>
    </div>
  );
};
