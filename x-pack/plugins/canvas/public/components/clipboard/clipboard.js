import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';

export class Clipboard extends React.PureComponent {
  static propTypes = {
    children: PropTypes.element.isRequired,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onCopy: PropTypes.func,
  };

  onClick = ev => {
    const { content, onCopy } = this.props;
    ev.preventDefault();

    const result = copy(content, { debug: true });

    if (typeof onCopy === 'function') onCopy(result);
  };

  render() {
    return (
      <div className="canvas_clipboard" onClick={this.onClick}>
        {this.props.children}
      </div>
    );
  }
}
