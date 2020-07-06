/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { Component } from 'react';

interface Props {
  location: Location;
}

export class ScrollToTopOnPathChange extends Component<Props> {
  public componentDidUpdate(prevProps: Props) {
    if (this.props.location.pathname !== prevProps.location.pathname) {
      window.scrollTo(0, 0);
    }
  }

  public render() {
    return null;
  }
}
