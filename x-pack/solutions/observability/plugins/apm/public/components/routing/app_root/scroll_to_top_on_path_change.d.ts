import type { Location } from 'history';
import { Component } from 'react';
interface Props {
    location: Location;
}
export declare class ScrollToTopOnPathChange extends Component<Props> {
    componentDidUpdate(prevProps: Props): void;
    render(): null;
}
export {};
