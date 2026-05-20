declare class ClickOutside extends React.Component<any, any, any> {
    constructor(props: any);
    constructor(props: any, context: any);
    componentDidMount(): void;
    componentWillUnmount(): void;
    setNodeRef: (node: any) => void;
    nodeRef: any;
    onClick: (event: any) => void;
    render(): React.JSX.Element;
}
declare namespace ClickOutside {
    namespace propTypes {
        let onClickOutside: PropTypes.Validator<(...args: any[]) => any>;
    }
}
export default ClickOutside;
import React from 'react';
import type PropTypes from 'prop-types';
