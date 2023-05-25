/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: We can't test this component because Enzyme doesn't support rendering
 * into portals.
 */

import deepEqual from 'fast-deep-equal';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { createPortal } from 'react-dom';

interface InsertPositionsMap {
  after: InsertPosition;
  before: InsertPosition;
}

export const insertPositions: InsertPositionsMap = {
  after: 'afterend',
  before: 'beforebegin',
};

export interface EuiPortalProps {
  /**
   * ReactNode to render as this component's content
   */
  children: ReactNode;
  insert?: { sibling: HTMLElement | null; position: 'before' | 'after' };
  portalRef?: (ref: HTMLDivElement | null) => void;
}

export class EuiPortal extends Component<EuiPortalProps> {
  portalNode: HTMLDivElement | null = null;

  constructor(props: EuiPortalProps) {
    super(props);
    if (typeof window === 'undefined') return; // Prevent SSR errors

    const { insert } = this.props;

    this.portalNode = document.createElement('div');
    this.portalNode.dataset.euiportal = 'true';

    if (insert == null || insert.sibling == null) {
      // no insertion defined, append to body
      document.body.appendChild(this.portalNode);
    } else {
      // inserting before or after an element
      const { sibling, position } = insert;
      sibling.insertAdjacentElement(insertPositions[position], this.portalNode);
    }
  }

  componentDidMount() {
    this.updatePortalRef(this.portalNode);
  }

  componentWillUnmount() {
    if (this.portalNode?.parentNode) {
      this.portalNode.parentNode.removeChild(this.portalNode);
    }
    this.updatePortalRef(null);
  }

  componentDidUpdate(prevProps: Readonly<EuiPortalProps>): void {
    if (!deepEqual(prevProps.insert, this.props.insert) && this.portalNode?.parentNode) {
      this.portalNode.parentNode.removeChild(this.portalNode);
    }

    if (this.portalNode) {
      if (this.props.insert == null || this.props.insert.sibling == null) {
        // no insertion defined, append to body
        document.body.appendChild(this.portalNode);
      } else {
        // inserting before or after an element
        const { sibling, position } = this.props.insert;
        sibling.insertAdjacentElement(insertPositions[position], this.portalNode);
      }
    }
  }

  updatePortalRef(ref: HTMLDivElement | null) {
    if (this.props.portalRef) {
      this.props.portalRef(ref);
    }
  }

  render() {
    return this.portalNode ? createPortal(this.props.children, this.portalNode) : null;
  }
}
