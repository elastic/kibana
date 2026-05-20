export default Suggestions;
declare class Suggestions extends React.Component<any, any, any> {
    constructor(props: any);
    constructor(props: any, context: any);
    childNodes: any[];
    scrollIntoView: () => void;
    componentDidUpdate(prevProps: any): void;
    render(): React.JSX.Element | null;
    parentNode: any;
}
declare namespace Suggestions {
    namespace propTypes {
        let index: PropTypes.Requireable<number>;
        let onClick: PropTypes.Validator<(...args: any[]) => any>;
        let onMouseEnter: PropTypes.Validator<(...args: any[]) => any>;
        let show: PropTypes.Requireable<boolean>;
        let suggestions: PropTypes.Validator<any[]>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
