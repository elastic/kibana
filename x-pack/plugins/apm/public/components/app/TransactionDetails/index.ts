/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TransactionDetailsView } from 'x-pack/plugins/apm/public/components/app/TransactionDetails/view';
import { selectWaterfallRoot } from 'x-pack/plugins/apm/public/store/selectors/waterfall';
import {
  getUrlParams,
  IUrlParams
} from 'x-pack/plugins/apm/public/store/urlParams';
import { Transaction } from '../../../../typings/Transaction';

interface Props {
  location: any;
  urlParams: IUrlParams;
  waterfallRoot: Transaction;
}

function mapStateToProps(state: any = {}, props: Partial<Props>) {
  return {
    location: state.location,
    urlParams: getUrlParams(state),
    waterfallRoot: selectWaterfallRoot(state, props)
  };
}

const mapDispatchToProps = {};
export const TransactionDetails = connect<{}, {}, Props>(
  mapStateToProps,
  mapDispatchToProps
)(TransactionDetailsView);
