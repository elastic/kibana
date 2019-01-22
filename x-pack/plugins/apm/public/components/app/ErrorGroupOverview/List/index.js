/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiBasicTable, EuiBadge } from '@elastic/eui';
import numeral from '@elastic/numeral';
import moment from 'moment';
import { toQuery, fromQuery, history } from '../../../shared/Links/url_helpers';
import { KibanaLink } from '../../../shared/Links/KibanaLink';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import styled from 'styled-components';
import {
  unit,
  px,
  fontFamilyCode,
  fontSizes,
  truncate
} from '../../../../style/variables';
import { NOT_AVAILABLE_LABEL } from '../../../../constants';
import { i18n } from '@kbn/i18n';

function paginateItems({ items, pageIndex, pageSize }) {
  return items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
}

const GroupIdLink = styled(KibanaLink)`
  font-family: ${fontFamilyCode};
`;

const MessageAndCulpritCell = styled.div`
  ${truncate('100%')};
`;

const MessageLink = styled(KibanaLink)`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

class List extends Component {
  state = {
    page: {
      index: 0,
      size: 25
    }
  };

  onTableChange = ({ page = {}, sort = {} }) => {
    this.setState({ page });

    const { location } = this.props;

    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        sortField: sort.field,
        sortDirection: sort.direction
      })
    });
  };

  render() {
    const { items } = this.props;
    const { serviceName, sortDirection, sortField } = this.props.urlParams;

    const paginatedItems = paginateItems({
      items,
      pageIndex: this.state.page.index,
      pageSize: this.state.page.size
    });

    const columns = [
      {
        name: i18n.translate('xpack.apm.errorsTable.groupIdColumnLabel', {
          defaultMessage: 'Group ID'
        }),
        field: 'groupId',
        sortable: false,
        width: px(unit * 6),
        render: groupId => {
          return (
            <GroupIdLink hash={`/${serviceName}/errors/${groupId}`}>
              {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
            </GroupIdLink>
          );
        }
      },
      {
        name: i18n.translate(
          'xpack.apm.errorsTable.errorMessageAndCulpritColumnLabel',
          {
            defaultMessage: 'Error message and culprit'
          }
        ),
        field: 'message',
        sortable: false,
        width: '50%',
        render: (message, item) => {
          return (
            <MessageAndCulpritCell>
              <TooltipOverlay content={message || NOT_AVAILABLE_LABEL}>
                <MessageLink hash={`/${serviceName}/errors/${item.groupId}`}>
                  {message || NOT_AVAILABLE_LABEL}
                </MessageLink>
              </TooltipOverlay>
              <TooltipOverlay content={item.culprit || NOT_AVAILABLE_LABEL}>
                <Culprit>{item.culprit || NOT_AVAILABLE_LABEL}</Culprit>
              </TooltipOverlay>
            </MessageAndCulpritCell>
          );
        }
      },
      {
        name: '',
        field: 'handled',
        sortable: false,
        align: 'right',
        render: isUnhandled =>
          isUnhandled === false && (
            <EuiBadge color="warning">
              {i18n.translate('xpack.apm.errorsTable.unhandledLabel', {
                defaultMessage: 'Unhandled'
              })}
            </EuiBadge>
          )
      },
      {
        name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
          defaultMessage: 'Occurrences'
        }),
        field: 'occurrenceCount',
        sortable: true,
        dataType: 'number',
        render: value =>
          value ? numeral(value).format('0.[0]a') : NOT_AVAILABLE_LABEL
      },
      {
        field: 'latestOccurrenceAt',
        sortable: true,
        name: i18n.translate(
          'xpack.apm.errorsTable.latestOccurrenceColumnLabel',
          {
            defaultMessage: 'Latest occurrence'
          }
        ),
        align: 'right',
        render: value => (value ? moment(value).fromNow() : NOT_AVAILABLE_LABEL)
      }
    ];

    return (
      <EuiBasicTable
        noItemsMessage={i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
          defaultMessage: 'No errors were found'
        })}
        items={paginatedItems}
        columns={columns}
        pagination={{
          pageIndex: this.state.page.index,
          pageSize: this.state.page.size,
          totalItemCount: this.props.items.length
        }}
        sorting={{
          sort: {
            field: sortField || 'latestOccurrenceAt',
            direction: sortDirection || 'desc'
          }
        }}
        onChange={this.onTableChange}
      />
    );
  }
}

List.propTypes = {
  location: PropTypes.object.isRequired
};

export default List;
