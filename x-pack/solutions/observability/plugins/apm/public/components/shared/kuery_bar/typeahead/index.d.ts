export class Typeahead extends React.Component<any, any, any> {
    static getDerivedStateFromProps(props: any, state: any): {
        value: any;
        initialValue: any;
    } | null;
    constructor(props: any);
    constructor(props: any, context: any);
    state: {
        isSuggestionsVisible: boolean;
        index: null;
        value: string;
        initialValue: string;
    };
    incrementIndex: (currentIndex: any) => void;
    decrementIndex: (currentIndex: any) => void;
    onKeyUp: (event: any) => void;
    onKeyDown: (event: any) => void;
    onBlur: () => void;
    selectSuggestion: (suggestion: any) => void;
    onClickOutside: () => void;
    onChangeInputValue: (event: any) => void;
    onClickInput: (event: any) => void;
    onClickSuggestion: (suggestion: any) => void;
    onMouseEnterSuggestion: (index: any) => void;
    onSubmit: () => void;
    render(): React.JSX.Element;
    inputRef: HTMLInputElement | undefined;
}
export namespace Typeahead {
    namespace propTypes {
        let initialValue: PropTypes.Requireable<string>;
        let isLoading: PropTypes.Requireable<boolean>;
        let disabled: PropTypes.Requireable<boolean>;
        let onChange: PropTypes.Validator<(...args: any[]) => any>;
        let onSubmit: PropTypes.Validator<(...args: any[]) => any>;
        let suggestions: PropTypes.Validator<any[]>;
        let placeholder: PropTypes.Validator<string>;
        let prepend: PropTypes.Requireable<NonNullable<PropTypes.ReactNodeLike>>;
    }
    namespace defaultProps {
        let isLoading_1: boolean;
        export { isLoading_1 as isLoading };
        let disabled_1: boolean;
        export { disabled_1 as disabled };
        let suggestions_1: never[];
        export { suggestions_1 as suggestions };
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
