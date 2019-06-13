/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { all } from 'lodash';
import {
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiConfirmModal,
  EuiOverlayMask
} from '@elastic/eui';
import { flattenPanelTree } from '../../../../lib/flatten_panel_tree';
import { INDEX_OPEN } from '../../../../../common/constants';
import { getActionExtensions } from '../../../../index_management_extensions';
import { getHttpClient } from '../../../../services/api';

export class IndexActionsContextMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      renderConfirmModal: null,
    };
  }
  closeConfirmModal = () => {
    this.setState({
      renderConfirmModal: null
    });
    this.props.resetSelection && this.props.resetSelection();
  }
  panels() {
    const {
      closeIndices,
      openIndices,
      flushIndices,
      refreshIndices,
      clearCacheIndices,
      editIndex,
      showMapping,
      showStats,
      showSettings,
      detailPanel,
      indexNames,
      indexStatusByName,
      performExtensionAction,
      indices,
      reloadIndices,
      unfreezeIndices,
    } = this.props;
    const allOpen = all(indexNames, indexName => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });
    const allFrozen = all(indices, (index) => index.isFrozen);
    const allUnfrozen = all(indices, (index) => !index.isFrozen);
    const selectedIndexCount = indexNames.length;
    const items = [];
    if (!detailPanel && selectedIndexCount === 1) {
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexSettingsLabel', {
          defaultMessage: 'Show {selectedIndexCount, plural, one {index} other {indices} } settings',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(showSettings);
        }
      });
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexMappingLabel', {
          defaultMessage: 'Show {selectedIndexCount, plural, one {index} other {indices} } mapping',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(showMapping);
        }
      });
      if (allOpen) {
        items.push({
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexStatsLabel', {
            defaultMessage: 'Show {selectedIndexCount, plural, one {index} other {indices} } stats',
            values: { selectedIndexCount }
          }),
          onClick: () => {
            this.closePopoverAndExecute(showStats);
          }
        });
      }
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.editIndexSettingsLabel', {
          defaultMessage: 'Edit {selectedIndexCount, plural, one {index} other {indices} } settings',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(editIndex);
        }
      });
    }
    if (allOpen) {
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.closeIndexLabel', {
          defaultMessage: 'Close {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(closeIndices);
        }
      });
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMergeIndexLabel', {
          defaultMessage: 'Force merge {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopover();
          this.setState({ renderConfirmModal: this.renderForcemergeSegmentsModal });
        }
      });
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.refreshIndexLabel', {
          defaultMessage: 'Refresh {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(refreshIndices);
        }
      });
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.clearIndexCacheLabel', {
          defaultMessage: 'Clear {selectedIndexCount, plural, one {index} other {indices} } cache',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(clearCacheIndices);
        }
      });
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.flushIndexLabel', {
          defaultMessage: 'Flush {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(flushIndices);
        }
      });
      if (allFrozen) {
        items.push({
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.unfreezeIndexLabel', {
            defaultMessage: 'Unfreeze {selectedIndexCount, plural, one {index} other {indices} }',
            values: { selectedIndexCount }
          }),
          onClick: () => {
            this.closePopoverAndExecute(unfreezeIndices);
          }
        });
      } else if (allUnfrozen) {
        items.push({
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.freezeIndexLabel', {
            defaultMessage: 'Freeze {selectedIndexCount, plural, one {index} other {indices} }',
            values: { selectedIndexCount }
          }),
          onClick: () => {
            this.closePopover();
            this.setState({ renderConfirmModal: this.renderConfirmFreezeModal });
          }
        });
      }
    } else {
      items.push({
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.openIndexLabel', {
          defaultMessage: 'Open {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount }
        }),
        onClick: () => {
          this.closePopoverAndExecute(openIndices);
        }
      });
    }
    items.push({
      name: i18n.translate('xpack.idxMgmt.indexActionsMenu.deleteIndexLabel', {
        defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {indices} }',
        values: { selectedIndexCount }
      }),
      onClick: () => {
        this.closePopover();
        this.setState({ renderConfirmModal: this.renderConfirmDeleteModal });
      }
    });
    getActionExtensions().forEach((actionExtension) => {
      const actionExtensionDefinition = actionExtension(indices, reloadIndices);
      if (actionExtensionDefinition) {
        const { buttonLabel, requestMethod, successMessage, renderConfirmModal } = actionExtensionDefinition;
        if (requestMethod) {
          items.push({
            name: buttonLabel,
            onClick: () => {
              this.closePopoverAndExecute(async () => {
                await performExtensionAction(requestMethod, successMessage);
              });
            },
          });
        } else {
          items.push({
            name: buttonLabel,
            onClick: () => {
              this.closePopover();
              this.setState({ renderConfirmModal });
            }
          });
        }
      }
    });
    items.forEach(item => {
      item['data-test-subj'] = 'indexTableContextMenuButton';
    });
    const panelTree = {
      id: 0,
      title: i18n.translate('xpack.idxMgmt.indexActionsMenu.panelTitle', {
        defaultMessage: '{selectedIndexCount, plural, one {Index} other {Indices} } options',
        values: { selectedIndexCount }
      }),
      items
    };
    return flattenPanelTree(panelTree);
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen
    }));
  };

  closePopoverAndExecute = func => {
    this.setState({
      isPopoverOpen: false,
      renderConfirmModal: false
    });
    func();
    this.props.resetSelection && this.props.resetSelection();
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false
    });
  };

  forcemergeSegmentsError = () => {
    const { forcemergeSegments } = this.state;
    if (!forcemergeSegments || forcemergeSegments.match(/^([1-9][0-9]*)?$/)) {
      return;
    } else {
      return i18n.translate('xpack.idxMgmt.indexActionsMenu.segmentsNumberErrorMessage', {
        defaultMessage: 'The number of segments must be greater than zero.'
      });
    }
  };
  renderForcemergeSegmentsModal = () => {
    const { forcemergeIndices, indexNames } = this.props;
    const helpText = i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeSegmentsHelpText', {
      defaultMessage: 'Merge the segments in an index until the number is reduced to this or fewer segments. The default is 1.'
    });
    const selectedIndexCount = indexNames.length;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.modalTitle', {
            defaultMessage: 'Force merge'
          })}
          onCancel={this.closeConfirmModal}
          onConfirm={() => {
            if (!this.forcemergeSegmentsError()) {
              this.closePopoverAndExecute(() => {
                forcemergeIndices(this.state.forcemergeSegments);
                this.setState({
                  forcemergeSegments: null,
                  showForcemergeSegmentsModal: null
                });
              });
            }
          }}
          cancelButtonText={
            i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel'
              }
            )
          }
          confirmButtonText={
            i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Force merge'
              }
            )
          }
        >
          <div>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeDescription"
                defaultMessage="You are about to force merge {selectedIndexCount, plural, one {this index} other {these indices} }:"
                values={{ selectedIndexCount }}
              />
            </p>
            <ul>
              {indexNames.map(indexName => (
                <li key={indexName}>{indexName}</li>
              ))}
            </ul>
            <EuiCallOut
              title={i18n.translate(
                'xpack.idxMgmt.indexActionsMenu.forceMerge.proceedWithCautionCallOutTitle',
                {
                  defaultMessage: 'Proceed with caution!'
                }
              )}
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeWarningDescription"
                  defaultMessage="
                    Force merging a large index or an index that is not read-only can
                    potentially cause performance and stability issues in the cluster
                    if it is not run properly (run against non-read-only indices) or run during peak hours.
                  "
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
            <EuiForm
              isInvalid={this.forcemergeSegmentsError()}
              error={this.forcemergeSegmentsError()}
            >
              <EuiFormRow
                label={i18n.translate(
                  'xpack.idxMgmt.indexActionsMenu.forceMerge.maximumNumberOfSegmentsFormRowLabel',
                  {
                    defaultMessage: 'Maximum number of segments per shard'
                  }
                )}
                helpText={helpText}
              >
                <EuiFieldText
                  onChange={event => {
                    this.setState({ forcemergeSegments: event.target.value });
                  }}
                  name="maxNumberSegments"
                />
              </EuiFormRow>
            </EuiForm>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  renderConfirmDeleteModal = () => {
    const { deleteIndices, indexNames } = this.props;
    const selectedIndexCount = indexNames.length;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            i18n.translate('xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.modalTitle', {
              defaultMessage: 'Confirm delete {selectedIndexCount, plural, one {index} other {indices} }',
              values: { selectedIndexCount }
            })
          }
          onCancel={this.closeConfirmModal}
          onConfirm={() => this.closePopoverAndExecute(deleteIndices)}
          cancelButtonText={
            i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel'
              }
            )
          }
          confirmButtonText={
            i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Confirm'
              }
            )
          }
        >
          <div>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteDescription"
                defaultMessage="You are about to delete {selectedIndexCount, plural, one {this index} other {these indices} }:"
                values={{ selectedIndexCount }}
              />
            </p>
            <ul>
              {indexNames.map(indexName => (
                <li key={indexName}>{indexName}</li>
              ))}
            </ul>
            <EuiCallOut
              title={
                i18n.translate(
                  'xpack.idxMgmt.indexActionsMenu.deleteIndex.proceedWithCautionCallOutTitle',
                  {
                    defaultMessage: 'Proceed with caution!'
                  }
                )
              }
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteWarningDescription"
                  defaultMessage="This operation cannot be undone. Make sure you have appropriate backups."
                />
              </p>
            </EuiCallOut>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };
  renderConfirmFreezeModal = () => {
    const oneIndexSelected = this.oneIndexSelected();
    const entity = this.getEntity(oneIndexSelected);
    const { freezeIndices, indexNames } = this.props;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            i18n.translate('xpack.idxMgmt.indexActionsMenu.freezeEntity.confirmModal.modalTitle', {
              defaultMessage: 'Confirm Freeze {entity}',
              values: { entity }
            })
          }
          onCancel={this.closeConfirmModal}
          onConfirm={() => this.closePopoverAndExecute(freezeIndices)}
          cancelButtonText={
            i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.freezeEntity.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel'
              }
            )
          }
          confirmButtonText={
            i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.freezeEntity.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Freeze {entity}',
                values: { entity }
              }
            )
          }
        >
          <div>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.freezeEntity.freezeDescription"
                defaultMessage="You are about to freeze  {oneIndexSelected, plural, one {this} other {these}}"
                values={{ oneIndexSelected: oneIndexSelected ? 1 : 0 }}
              />
              {' '}
              {entity}:
            </p>
            <ul>
              {indexNames.map(indexName => (
                <li key={indexName}>{indexName}</li>
              ))}
            </ul>
            <EuiCallOut
              title={
                i18n.translate(
                  'xpack.idxMgmt.indexActionsMenu.freezeEntity.proceedWithCautionCallOutTitle',
                  {
                    defaultMessage: 'Proceed with caution'
                  }
                )
              }
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.freezeEntity.freezeEntityWarningDescription"
                  defaultMessage="
                    A frozen index has little overhead on the cluster and is blocked for write operations.
                    You can search a frozen index, but expect queries to be slower.
                  "
                />
              </p>
            </EuiCallOut>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };
  oneIndexSelected = () => {
    return this.props.indexNames.length === 1;
  };
  getEntity = oneIndexSelected => {
    return oneIndexSelected ? (
      i18n.translate('xpack.idxMgmt.indexActionsMenu.indexMessage', {
        defaultMessage: 'index'
      })
    ) : (
      i18n.translate('xpack.idxMgmt.indexActionsMenu.indicesMessage', {
        defaultMessage: 'indices'
      })
    );
  };
  render() {
    const { indexNames } = this.props;
    const selectedIndexCount = indexNames.length;
    const {
      iconSide = 'right',
      anchorPosition = 'rightUp',
      label = i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonLabel', {
        defaultMessage: 'Manage {selectedIndexCount, plural, one {index} other {indices}}',
        values: { selectedIndexCount }
      }),
      iconType = 'arrowDown'
    } = this.props;
    const panels = this.panels();
    const button = (
      <EuiButton
        data-test-subj="indexActionsContextMenuButton"
        iconSide={iconSide}
        aria-label={i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonAriaLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {index} other {indices} } options',
          values: { selectedIndexCount }
        })}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill
      >
        {label}
      </EuiButton>
    );

    return (
      <div>
        {this.state.renderConfirmModal ? this.state.renderConfirmModal(this.closeConfirmModal, getHttpClient()) : null}
        <EuiPopover
          id="contextMenuIndices"
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          withTitle
          anchorPosition={anchorPosition}
          repositionOnScroll
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
    );
  }
}
