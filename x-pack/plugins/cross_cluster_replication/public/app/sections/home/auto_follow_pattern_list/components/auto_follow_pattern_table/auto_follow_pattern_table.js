/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingKibana,
  EuiToolTip,
  EuiOverlayMask,
} from '@elastic/eui';
import { API_STATUS } from '../../../../../constants';
import { AutoFollowPatternDeleteProvider } from '../../../../../components';
import routing from '../../../../../services/routing';

export const AutoFollowPatternTable = injectI18n(
  class extends PureComponent {
    static propTypes = {
      autoFollowPatterns: PropTypes.array,
      openDetailPanel: PropTypes.func.isRequired,
    }

    state = {
      selectedItems: [],
    }

    onSearch = ({ query }) => {
      const { text } = query;
      const normalizedSearchText = text.toLowerCase();
      this.setState({
        queryText: normalizedSearchText,
      });
    };

    getFilteredPatterns = () => {
      const { autoFollowPatterns } = this.props;
      const { queryText } = this.state;

      if(queryText) {
        return autoFollowPatterns.filter(autoFollowPattern => {
          const { name, remoteCluster, followIndexPatternPrefix, followIndexPatternSuffix } = autoFollowPattern;

          const inName = name.toLowerCase().includes(queryText);
          const inRemoteCluster = remoteCluster.toLowerCase().includes(queryText);
          const inPrefix = followIndexPatternPrefix.toLowerCase().includes(queryText);
          const inSuffix = followIndexPatternSuffix.toLowerCase().includes(queryText);

          return inName || inRemoteCluster || inPrefix || inSuffix;
        });
      }

      return autoFollowPatterns.slice(0);
    };

    getTableColumns() {
      const { intl, editAutoFollowPattern, openDetailPanel } = this.props;

      return [{
        field: 'name',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternList.table.nameColumnTitle',
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: false,
        render: (name) => {
          return (
            <EuiLink onClick={() => openDetailPanel(name)}>
              {name}
            </EuiLink>
          );
        }
      }, {
        field: 'remoteCluster',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternList.table.clusterColumnTitle',
          defaultMessage: 'Cluster',
        }),
        truncateText: true,
        sortable: true,
      }, {
        field: 'leaderIndexPatterns',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternList.table.leaderPatternsColumnTitle',
          defaultMessage: 'Leader patterns',
        }),
        render: (leaderPatterns) => leaderPatterns.join(', '),
      }, {
        field: 'followIndexPatternPrefix',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternList.table.prefixColumnTitle',
          defaultMessage: 'Follower pattern prefix',
        }),
        sortable: true,
      }, {
        field: 'followIndexPatternSuffix',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternList.table.suffixColumnTitle',
          defaultMessage: 'Follower pattern suffix',
        }),
        sortable: true,
      }, {
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.autoFollowPatternList.table.actionsColumnTitle',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: ({ name }) => {
              const label = i18n.translate(
                'xpack.crossClusterReplication.autofollowPatternList.table.actionDeleteDescription',
                {
                  defaultMessage: 'Delete auto-follow pattern',
                }
              );

              return (
                <EuiToolTip
                  content={label}
                  delay="long"
                >
                  <AutoFollowPatternDeleteProvider>
                    {(deleteAutoFollowPattern) => (
                      <EuiButtonIcon
                        aria-label={label}
                        iconType="trash"
                        color="danger"
                        onClick={() => deleteAutoFollowPattern(name)}
                      />
                    )}
                  </AutoFollowPatternDeleteProvider>
                </EuiToolTip>
              );
            },
          },
          {
            name: intl.formatMessage({
              id: 'xpack.crossClusterReplication.editIndexPattern.fields.table.actionEditLabel',
              defaultMessage: 'Edit',
            }),
            description: intl.formatMessage({
              id: 'xpack.crossClusterReplication.editIndexPattern.fields.table.actionEditDescription',
              defaultMessage: 'Edit',
            }),
            icon: 'pencil',
            onClick: ({ name }) => {
              editAutoFollowPattern(name);
              routing.navigate(encodeURI(`/auto_follow_patterns/edit/${encodeURIComponent(name)}`));
            },
            type: 'icon',
          },
        ],
        width: '100px',
      }];
    }

    renderLoading = () => {
      const { apiStatusDelete } = this.props;

      if (apiStatusDelete === API_STATUS.DELETING) {
        return (
          <EuiOverlayMask>
            <EuiLoadingKibana size="xl"/>
          </EuiOverlayMask>
        );
      }
      return null;
    };

    render() {
      const {
        selectedItems,
      } = this.state;

      const sorting = {
        sort: {
          field: 'name',
          direction: 'asc',
        }
      };

      const pagination = {
        initialPageSize: 20,
        pageSizeOptions: [10, 20, 50]
      };

      const selection = {
        onSelectionChange: (selectedItems) => this.setState({ selectedItems })
      };

      const search = {
        toolsLeft: selectedItems.length ? (
          <AutoFollowPatternDeleteProvider>
            {(deleteAutoFollowPattern) => (
              <EuiButton
                iconType="trash"
                color="danger"
                onClick={() => deleteAutoFollowPattern(selectedItems.map(({ name }) => name))}
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.deleteAutoFollowPatternButtonLabel"
                  defaultMessage="Delete auto-follow {total, plural, one {pattern} other {patterns}}"
                  values={{
                    total: selectedItems.length
                  }}
                />
              </EuiButton>
            )}
          </AutoFollowPatternDeleteProvider>
        ) : undefined,
        onChange: this.onSearch,
        box: {
          incremental: true,
        },
      };

      return (
        <Fragment>
          <EuiInMemoryTable
            items={this.getFilteredPatterns()}
            itemId="name"
            columns={this.getTableColumns()}
            search={search}
            pagination={pagination}
            sorting={sorting}
            selection={selection}
            isSelectable={true}
          />
          {this.renderLoading()}
        </Fragment>
      );
    }
  }
);
