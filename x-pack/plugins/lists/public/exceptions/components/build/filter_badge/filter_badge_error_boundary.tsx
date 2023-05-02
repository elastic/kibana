/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { FilterBadgeInvalidPlaceholder } from './filter_badge_invalid';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FilterBadgeErrorBoundaryProps {}

interface FilterBadgeErrorBoundaryState {
  hasError: boolean;
}

export class FilterBadgeErrorBoundary extends Component<
  FilterBadgeErrorBoundaryProps,
  FilterBadgeErrorBoundaryState
> {
  constructor(props: FilterBadgeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentWillReceiveProps() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <FilterBadgeInvalidPlaceholder />;
    }

    return this.props.children;
  }
}
