import React from 'react';
import ReactDOM from 'react-dom';
import Markdown from 'markdown-it';
import './markdown.scss';

const md = new Markdown();

export const markdown = () => ({
  name: 'markdown',
  displayName: 'Markdown',
  help: 'Render HTML Markup using Markdown input',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const html = { __html: md.render(String(config.content)) };
    const fontStyle = config.font ? config.font.spec : {};

    /* eslint-disable react/no-danger */
    ReactDOM.render(
      <div className="canvasMarkdown" style={fontStyle} dangerouslySetInnerHTML={html} />,
      domNode,
      () => handlers.done()
    );
    /* eslint-enable */

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
