import type { CustomLinkES, CustomLink, Filter } from '../../../../common/custom_link/custom_link_types';
export declare function fromESFormat(customLinkES: CustomLinkES): CustomLink;
export declare function toESFormat(customLink: CustomLink): CustomLinkES;
export declare function splitFilterValueByComma(searchQuery: Filter['value']): string[];
