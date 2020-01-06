import React from 'react';
import ReactDOM from 'react-dom';

export const renderApp = (element: any) => {
  ReactDOM.render(<div>Hi there</div>, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
