/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { Location } from 'history';
import React from 'react';
import { connect } from 'react-redux';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { getRisonHref, RisonHrefArgs } from './rison_helpers';

interface Props extends RisonHrefArgs {
  disabled?: boolean;
  to?: StringMap;
  className?: string;
}

/**
 * NOTE: Use this component directly if you have to use a link that is
 * going to be rendered outside of React, e.g. in the Kibana global toast loader.
 *
 * You must remember to pass in location in that case.
 */
const UnconnectedKibanaRisonLink: React.FunctionComponent<Props> = ({
  location,
  pathname,
  hash,
  query,
  ...props
}) => {
  const href = getRisonHref({
    location,
    pathname,
    hash,
    query
  });
  return <EuiLink {...props} href={href} />;
};

const withLocation = connect(
  ({ location }: { location: Location }) => ({ location }),
  {}
);

const KibanaRisonLink = withLocation(UnconnectedKibanaRisonLink);

export { UnconnectedKibanaRisonLink, KibanaRisonLink };
