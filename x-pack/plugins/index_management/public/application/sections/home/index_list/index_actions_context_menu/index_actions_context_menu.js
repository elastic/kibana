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
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiConfirmModal,
} from '@elastic/eui';

import { flattenPanelTree } from '../../../../lib/flatten_panel_tree';
import { INDEX_OPEN, IndexDetailsSection } from '../../../../../../common/constants';
import { getIndexDetailsLink, navigateToIndexDetailsPage } from '../../../../services/routing';
import { AppContext } from '../../../../app_context';

export class IndexActionsContextMenu extends Component {
  static contextType = AppContext;

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
  panels() {
    const {
      services: { extensionsService },
      core: { getUrlForApp, application, http },
      history,
      config: { enableIndexActions },
    } = this.context;

    const {
      closeIndices,
      openIndices,
      flushIndices,
      refreshIndices,
      clearCacheIndices,
      isOnListView,
      indexNames,
      indexStatusByName,
      performExtensionAction,
      indices,
      reloadIndices,
      unfreezeIndices,
      indicesListURLParams,
    } = this.props;
    const allOpen = every(indexNames, (indexName) => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });
    const allFrozen = every(indices, (index) => index.isFrozen);
    const selectedIndexCount = indexNames.length;
    const items = [];
    if (isOnListView && selectedIndexCount === 1) {
      items.push({
        'data-test-subj': 'showOverviewIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexOverviewLabel', {
          defaultMessage: 'Show index overview',
        }),
        onClick: () => {
          navigateToIndexDetailsPage(
            indexNames[0],
            indicesListURLParams,
            extensionsService,
            application,
            http,
            IndexDetailsSection.Overview
          );
        },
      });
      items.push({
        'data-test-subj': 'showSettingsIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexSettingsLabel', {
          defaultMessage: 'Show index settings',
        }),
        onClick: () => {
          navigateToIndexDetailsPage(
            indexNames[0],
            indicesListURLParams,
            extensionsService,
            application,
            http,
            IndexDetailsSection.Settings
          );
        },
      });
      items.push({
        'data-test-subj': 'showMappingsIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexMappingLabel', {
          defaultMessage: 'Show index mapping',
        }),
        onClick: () => {
          navigateToIndexDetailsPage(
            indexNames[0],
            indicesListURLParams,
            extensionsService,
            application,
            http,
            IndexDetailsSection.Mappings
          );
        },
      });
      if (allOpen && enableIndexActions) {
        items.push({
          'data-test-subj': 'showStatsIndexMenuButton',
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexStatsLabel', {
            defaultMessage: 'Show index stats',
          }),
          onClick: () => {
            history.push(
              getIndexDetailsLink(indexNames[0], indicesListURLParams, IndexDetailsSection.Stats)
            );
          },
        });
      }
    }
    if (allOpen && enableIndexActions) {
      items.push({
        'data-test-subj': 'closeIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.closeIndexLabel', {
          defaultMessage: 'Close {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
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
    } else if (!allOpen && enableIndexActions) {
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
      'data-test-subj': 'deleteIndexMenuButton',
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
              data-test-subj="indexActionsForcemergeNumSegments"
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
    const { deleteIndices, indexNames } = this.props;
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
        confirmButtonDisabled={false}
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
        {standardIndexModalBody}
      </EuiConfirmModal>
    );
  };

  render() {
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
      fill = true,
      isLoading = false,
    } = this.props;

    const panels = this.panels();

    const button = (
      <EuiButton
        data-test-subj="indexActionsContextMenuButton"
        iconSide={iconSide}
        aria-label={i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonAriaLabel', {
          defaultMessage: '{selectedIndexCount, plural, one {index} other {indices} } options',
          values: { selectedIndexCount },
        })}
        onClick={this.onButtonClick}
        iconType={iconType}
        fill={fill}
        isLoading={isLoading}
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
          <EuiContextMenu data-test-subj="indexContextMenu" initialPanelId={0} panels={panels} />
        </EuiPopover>
      </div>
    );
  }
}
