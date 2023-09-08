# expandable flyout panels

## Description

This folder hosts the panels that are displayed in the expandable flyout (see `@kbn/expandable-flyout` package).

> Remember to add any new panels to the `index.tsx` at the root of the `flyout` folder. These are passed to the `@kbn/expandable-flyout` package as `registeredPanels`.

## Notes

At the moment, we only have a single expandable flyout for the Security Solution plugin. This flyout will be used for all documents (signals, events, indicators, assets and findings). We're using a set of generic right/left/preview panels, hence the following folder structure:

```
flyout
│   index.tsx
│   README.md
│
└───right
└───left
└───preview
```

If different right, left or preview panels are needed, we should refactor the folder structure as follows:

```
flyout
│   index.tsx
│   README.md    
│
└───documents
│   └───right
│   └───left
│   └───preview
│
└───new_type
│   └───right
│   └───left
│   └───preview
│
└───other_new_type
    └───right
    └───left
    └───preview
```
