/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiAccordionProps } from '@elastic/eui';
import * as React from 'react';

type Props = Pick<EuiAccordionProps, Exclude<keyof EuiAccordionProps, 'initialIsOpen'>> & {
  forceExpand?: boolean;
};

interface State {
  expanded: boolean;
}

/**
 * An accordion that doesn't render it's content unless it's expanded.
 * This component was created because `EuiAccordion`'s eager rendering of
 * accordion content was creating performance issues when used in repeating
 * content on the page.
 *
 * The current implementation actually renders the content *outside* of the
 * actual EuiAccordion when the accordion is expanded! It does this because
 * EuiAccordian applies a `translate` style to the content that causes
 * any draggable content (inside `EuiAccordian`) to have a `translate` style
 * that messes up rendering while the user drags it.
 *
 * TODO: animate the expansion and collapse of content rendered "below"
 * the real `EuiAccordion`.
 */
export class LazyAccordion extends React.PureComponent<Props, State> {
  constructor(props: EuiAccordionProps) {
    super(props);

    this.state = {
      expanded: false,
    };
  }

  public onCollapsedClick = () => {
    this.setState({ expanded: true });
  };

  public onExpandedClick = () => {
    this.setState({ expanded: false });
  };

  public render() {
    const {
      id,
      buttonContentClassName,
      buttonContent,
      forceExpand,
      extraAction,
      paddingSize,
      children,
    } = this.props;

    return (
      <>
        {forceExpand || this.state.expanded ? (
          <>
            <EuiAccordion
              buttonContent={buttonContent}
              buttonContentClassName={buttonContentClassName}
              data-test-subj="lazy-accordion-expanded"
              extraAction={extraAction}
              id={id}
              initialIsOpen={true}
              onClick={this.onExpandedClick}
              paddingSize={paddingSize}
            >
              <></>
            </EuiAccordion>
            {children}
          </>
        ) : (
          <EuiAccordion
            buttonContent={buttonContent}
            buttonContentClassName={buttonContentClassName}
            data-test-subj="lazy-accordion-placeholder"
            extraAction={extraAction}
            id={id}
            onClick={this.onCollapsedClick}
            paddingSize={paddingSize}
          >
            <></>
          </EuiAccordion>
        )}
      </>
    );
  }
}
