export default Suggestion;
declare function Suggestion(props: any): React.JSX.Element;
declare namespace Suggestion {
    namespace propTypes {
        let onClick: PropTypes.Validator<(...args: any[]) => any>;
        let onMouseEnter: PropTypes.Validator<(...args: any[]) => any>;
        let selected: PropTypes.Requireable<boolean>;
        let suggestion: PropTypes.Validator<object>;
        let innerRef: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
