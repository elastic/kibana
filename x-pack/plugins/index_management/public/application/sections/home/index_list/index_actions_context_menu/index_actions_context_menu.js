/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { every } from 'lodash';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiConfirmModal,
  EuiCheckbox,
} from '@elastic/eui';

import { flattenPanelTree } from '../../../../lib/flatten_panel_tree';
import { INDEX_OPEN } from '../../../../../../common/constants';
import { AppContextConsumer } from '../../../../app_context';

export class IndexActionsContextMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      renderConfirmModal: null,
      isActionConfirmed: false,
    };
  }
  closeConfirmModal = () => {
    this.setState({
      renderConfirmModal: null,
    });
    this.props.resetSelection && this.props.resetSelection();
  };
  confirmAction = (isActionConfirmed) => {
    this.setState({ isActionConfirmed });
  };
  panels({ services: { extensionsService }, core: { getUrlForApp } }) {
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
      hasSystemIndex,
    } = this.props;
    const allOpen = every(indexNames, (indexName) => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });
    const allFrozen = every(indices, (index) => index.isFrozen);
    const selectedIndexCount = indexNames.length;
    const items = [];
    if (!detailPanel && selectedIndexCount === 1) {
      items.push({
        'data-test-subj': 'showSettingsIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexSettingsLabel', {
          defaultMessage:
            'Show {selectedIndexCount, plural, one {index} other {indices} } settings',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(showSettings);
        },
      });
      items.push({
        'data-test-subj': 'showMappingsIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexMappingLabel', {
          defaultMessage: 'Show {selectedIndexCount, plural, one {index} other {indices} } mapping',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(showMapping);
        },
      });
      if (allOpen) {
        items.push({
          'data-test-subj': 'showStatsIndexMenuButton',
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexStatsLabel', {
            defaultMessage: 'Show {selectedIndexCount, plural, one {index} other {indices} } stats',
            values: { selectedIndexCount },
          }),
          onClick: () => {
            this.closePopoverAndExecute(showStats);
          },
        });
      }
      items.push({
        'data-test-subj': 'editIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.editIndexSettingsLabel', {
          defaultMessage:
            'Edit {selectedIndexCount, plural, one {index} other {indices} } settings',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(editIndex);
        },
      });
    }
    if (allOpen) {
      items.push({
        'data-test-subj': 'closeIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.closeIndexLabel', {
          defaultMessage: 'Close {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          if (hasSystemIndex) {
            this.closePopover();
            this.setState({ renderConfirmModal: this.renderConfirmCloseModal });
            return;
          }
          this.closePopoverAndExecute(closeIndices);
        },
      });
      items.push({
        'data-test-subj': 'forcemergeIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMergeIndexLabel', {
          defaultMessage: 'Force merge {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopover();
          this.setState({ renderConfirmModal: this.renderForcemergeSegmentsModal });
        },
      });
      items.push({
        'data-test-subj': 'refreshIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.refreshIndexLabel', {
          defaultMessage: 'Refresh {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(refreshIndices);
        },
      });
      items.push({
        'data-test-subj': 'clearCacheIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.clearIndexCacheLabel', {
          defaultMessage: 'Clear {selectedIndexCount, plural, one {index} other {indices} } cache',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(clearCacheIndices);
        },
      });
      items.push({
        'data-test-subj': 'flushIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.flushIndexLabel', {
          defaultMessage: 'Flush {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(flushIndices);
        },
      });
      if (allFrozen) {
        items.push({
          'data-test-subj': 'unfreezeIndexMenuButton',
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.unfreezeIndexLabel', {
            defaultMessage: 'Unfreeze {selectedIndexCount, plural, one {index} other {indices} }',
            values: { selectedIndexCount },
          }),
          onClick: () => {
            this.closePopoverAndExecute(unfreezeIndices);
          },
        });
      }
    } else {
      items.push({
        'data-test-subj': 'openIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.openIndexLabel', {
          defaultMessage: 'Open {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          this.closePopoverAndExecute(openIndices);
        },
      });
    }
    items.push({
      name: i18n.translate('xpack.idxMgmt.indexActionsMenu.deleteIndexLabel', {
        defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {indices} }',
        values: { selectedIndexCount },
      }),
      onClick: () => {
        this.closePopover();
        this.setState({ renderConfirmModal: this.renderConfirmDeleteModal });
      },
    });
    extensionsService.actions.forEach((actionExtension) => {
      const actionExtensionDefinition = actionExtension({
        indices,
        reloadIndices,
        getUrlForApp,
      });
      if (actionExtensionDefinition) {
        const { buttonLabel, requestMethod, successMessage, renderConfirmModal } =
          actionExtensionDefinition;
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
            },
          });
        }
      }
    });
    const panelTree = {
      id: 0,
      title: i18n.translate('xpack.idxMgmt.indexActionsMenu.panelTitle', {
        defaultMessage: '{selectedIndexCount, plural, one {Index} other {Indices} } options',
        values: { selectedIndexCount },
      }),
      items,
    };
    return flattenPanelTree(panelTree);
  }

  onButtonClick = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopoverAndExecute = (func) => {
    this.setState({
      isPopoverOpen: false,
      renderConfirmModal: false,
    });
    func();
    this.props.resetSelection && this.props.resetSelection();
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  forcemergeSegmentsError = () => {
    const { forcemergeSegments } = this.state;
    if (!forcemergeSegments || forcemergeSegments.match(/^([1-9][0-9]*)?$/)) {
      return;
    } else {
      return i18n.translate('xpack.idxMgmt.indexActionsMenu.segmentsNumberErrorMessage', {
        defaultMessage: 'The number of segments must be greater than zero.',
      });
    }
  };
  renderForcemergeSegmentsModal = () => {
    const { forcemergeIndices, indexNames } = this.props;
    const helpText = i18n.translate(
      'xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeSegmentsHelpText',
      {
        defaultMessage:
          'Merge the segments in an index until the number is reduced to this or fewer segments. The default is 1.',
      }
    );
    const selectedIndexCount = indexNames.length;

    return (
      <EuiConfirmModal
        title={i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.modalTitle', {
          defaultMessage: 'Force merge',
        })}
        onCancel={this.closeConfirmModal}
        onConfirm={() => {
          if (!this.forcemergeSegmentsError()) {
            this.closePopoverAndExecute(() => {
              forcemergeIndices(this.state.forcemergeSegments);
              this.setState({
                forcemergeSegments: null,
                showForcemergeSegmentsModal: null,
              });
            });
          }
        }}
        cancelButtonText={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Force merge',
          }
        )}
      >
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeDescription"
            defaultMessage="You are about to force merge {selectedIndexCount, plural, one {this index} other {these indices} }:"
            values={{ selectedIndexCount }}
          />
        </p>

        <ul>
          {indexNames.map((indexName) => (
            <li key={indexName}>{indexName}</li>
          ))}
        </ul>

        <EuiCallOut
          title={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.forceMerge.proceedWithCautionCallOutTitle',
            {
              defaultMessage: 'Proceed with caution!',
            }
          )}
          color="warning"
          iconType="help"
        >
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeWarningDescription"
              defaultMessage="
                  Don't force-merge indices to which you're still writing, or to which you'll write
                  again in the future. Instead, rely on the automatic background merge process to
                  perform merges as needed to keep the index running smoothly. If you write to
                  a force-merged index then its performance may become much worse.
                "
            />
          </p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        <EuiForm
          isInvalid={!!this.forcemergeSegmentsError()}
          error={this.forcemergeSegmentsError()}
        >
          <EuiFormRow
            label={i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.forceMerge.maximumNumberOfSegmentsFormRowLabel',
              {
                defaultMessage: 'Maximum number of segments per shard',
              }
            )}
            helpText={helpText}
          >
            <EuiFieldNumber
              onChange={(event) => {
                this.setState({ forcemergeSegments: event.target.value });
              }}
              min={1}
              name="maxNumberSegments"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiConfirmModal>
    );
  };

  renderConfirmDeleteModal = () => {
    const { deleteIndices, indexNames, hasSystemIndex, isSystemIndexByName } = this.props;
    const { isActionConfirmed } = this.state;
    const selectedIndexCount = indexNames.length;

    const standardIndexModalBody = (
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteDescription"
            defaultMessage="You are about to delete {selectedIndexCount, plural, one {this index} other {these indices} }:"
            values={{ selectedIndexCount }}
          />
        </p>

        <ul>
          {indexNames.map((indexName) => (
            <li key={indexName}>{indexName}</li>
          ))}
        </ul>

        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteWarningDescription"
            defaultMessage="You can't recover a deleted index. Make sure you have appropriate backups."
          />
        </p>
      </Fragment>
    );

    const systemIndexModalBody = (
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteDescription"
            defaultMessage="You are about to delete {selectedIndexCount, plural, one {this index} other {these indices} }:"
            values={{ selectedIndexCount }}
          />
        </p>

        <ul>
          {indexNames.map((indexName) => (
            <li key={indexName}>
              {indexName}
              {isSystemIndexByName[indexName] ? (
                <Fragment>
                  {' '}
                  <EuiBadge iconType="alert" color="hollow">
                    <FormattedMessage
                      id="xpack.idxMgmt.indexActionsMenu.deleteIndex.systemIndexLabel"
                      defaultMessage="System index"
                    />
                  </EuiBadge>
                </Fragment>
              ) : (
                ''
              )}
            </li>
          ))}
        </ul>

        <EuiCallOut
          title={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.deleteIndex.proceedWithCautionCallOutTitle',
            {
              defaultMessage: 'Deleting a system index can break Kibana',
            }
          )}
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexActionsMenu.deleteIndex.proceedWithCautionCallOutDescription"
              defaultMessage="System indices are critical for internal operations.
                If you delete a system index, you can't recover it. Make sure you have appropriate backups."
            />
          </p>
          <EuiCheckbox
            id="confirmDeleteIndicesCheckbox"
            label={
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.deleteIndex.checkboxLabel"
                defaultMessage="I understand the consequences of deleting a system index"
              />
            }
            checked={isActionConfirmed}
            onChange={(e) => this.confirmAction(e.target.checked)}
          />
        </EuiCallOut>
      </Fragment>
    );

    return (
      <EuiConfirmModal
        title={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.modalTitle',
          {
            defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {# indices} }',
            values: { selectedIndexCount },
          }
        )}
        onCancel={() => {
          this.confirmAction(false);
          this.closeConfirmModal();
        }}
        onConfirm={() => this.closePopoverAndExecute(deleteIndices)}
        buttonColor="danger"
        confirmButtonDisabled={hasSystemIndex ? !isActionConfirmed : false}
        cancelButtonText={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {indices} }',
            values: { selectedIndexCount },
          }
        )}
      >
        {hasSystemIndex ? systemIndexModalBody : standardIndexModalBody}
      </EuiConfirmModal>
    );
  };

  renderConfirmCloseModal = () => {
    const { closeIndices, indexNames, isSystemIndexByName } = this.props;
    const { isActionConfirmed } = this.state;
    const selectedIndexCount = indexNames.length;

    return (
      <EuiConfirmModal
        title={i18n.translate('xpack.idxMgmt.indexActionsMenu.closeIndex.confirmModal.modalTitle', {
          defaultMessage: 'Close {selectedIndexCount, plural, one {index} other {# indices} }',
          values: { selectedIndexCount },
        })}
        onCancel={() => {
          this.confirmAction(false);
          this.closeConfirmModal();
        }}
        onConfirm={() => this.closePopoverAndExecute(closeIndices)}
        buttonColor="danger"
        confirmButtonDisabled={!isActionConfirmed}
        cancelButtonText={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={i18n.translate(
          'xpack.idxMgmt.indexActionsMenu.closeIndex.confirmModal.confirmButtonText',
          {
            defaultMessage: 'Close {selectedIndexCount, plural, one {index} other {indices} }',
            values: { selectedIndexCount },
          }
        )}
      >
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.closeIndex.closeDescription"
            defaultMessage="You are about to close {selectedIndexCount, plural, one {this index} other {these indices} }:"
            values={{ selectedIndexCount }}
          />
        </p>

        <ul>
          {indexNames.map((indexName) => (
            <li key={indexName}>
              {indexName}
              {isSystemIndexByName[indexName] ? (
                <Fragment>
                  {' '}
                  <EuiBadge iconType="alert" color="hollow">
                    <FormattedMessage
                      id="xpack.idxMgmt.indexActionsMenu.closeIndex.systemIndexLabel"
                      defaultMessage="System index"
                    />
                  </EuiBadge>
                </Fragment>
              ) : (
                ''
              )}
            </li>
          ))}
        </ul>

        <EuiCallOut
          title={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.closeIndex.proceedWithCautionCallOutTitle',
            {
              defaultMessage: 'Closing a system index can break Kibana',
            }
          )}
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexActionsMenu.closeIndex.proceedWithCautionCallOutDescription"
              defaultMessage="System indices are critical for internal operations.
                  You can reopen the index using the Open Index API."
            />
          </p>
          <EuiCheckbox
            id="confirmCloseIndicesCheckbox"
            label={
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.closeIndex.checkboxLabel"
                defaultMessage="I understand the consequences of closing a system index"
              />
            }
            checked={isActionConfirmed}
            onChange={(e) => this.confirmAction(e.target.checked)}
          />
        </EuiCallOut>
      </EuiConfirmModal>
    );
  };

  render() {
    return (
      <AppContextConsumer>
        {(appDependencies) => {
          const { indexNames } = this.props;
          const selectedIndexCount = indexNames.length;
          const {
            iconSide = 'right',
            anchorPosition = 'rightUp',
            label = i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonLabel', {
              defaultMessage:
                'Manage {selectedIndexCount, plural, one {index} other {{selectedIndexCount} indices}}',
              values: { selectedIndexCount },
            }),
            iconType = 'arrowDown',
          } = this.props;

          const panels = this.panels(appDependencies);

          const button = (
            <EuiButton
              data-test-subj="indexActionsContextMenuButton"
              iconSide={iconSide}
              aria-label={i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonAriaLabel', {
                defaultMessage:
                  '{selectedIndexCount, plural, one {index} other {indices} } options',
                values: { selectedIndexCount },
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
              {this.state.renderConfirmModal
                ? this.state.renderConfirmModal(this.closeConfirmModal)
                : null}
              <EuiPopover
                id="contextMenuIndices"
                button={button}
                isOpen={this.state.isPopoverOpen}
                closePopover={this.closePopover}
                panelPaddingSize="none"
                anchorPosition={anchorPosition}
                repositionOnScroll
              >
                <EuiContextMenu
                  data-test-subj="indexContextMenu"
                  initialPanelId={0}
                  panels={panels}
                />
              </EuiPopover>
            </div>
          );
        }}
      </AppContextConsumer>
    );
  }
}
