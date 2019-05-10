# Drag / Drop

This is a simple drag / drop mechanism that plays nice with React.

We aren't using EUI or another library, due to the fact that Lens visualizations and datasources may or may not be written in React. Even visualizations which are written in React will end up having their own ReactDOM.render call, and in that sense will be a standalone React application. We want to enable drag / drop across React and native DOM boundaries.

## Getting started

First, place a RootDragDropProvider at the root of your application.

```js
<RootDragDropProvider>
  ... your app here ...
</RootDragDropProvider>
```

If you have a child React application (e.g. a visualization), you will need to pass the drag / drop context down into it. This can be obtained like so:

```js
const context = useContext(DragContext);
```

In your child application, place a `ChildDragDropProvider` at the root of that, and spread the context into it:

```js
<ChildDragDropProvider {...context}>
  ... your child app here ...
</ChildDragDropProvider>
```

This enables your child application to share the same drag / drop context as the root application.

## Dragging

An item can be both draggable and droppable at the same time, but for simplicity's sake, we'll treat these two cases separately.

To enable dragging an item, use `DragDrop` with both a `draggable` and a `value` attribute.

```js
<div className="field-list">
  {fields.map(f => (
    <DragDrop key={f.id} className="field-list-item" value={f} draggable>
      {f.name}
    </DragDrop>
  ))}
</div>
```

## Dropping

To enable dropping, use `DragDrop` with both a `droppable` attribute and an `onDrop` handler attribute. Droppable should only be set to true if there is an item being dragged, and if a drop of the dragged item is supported.

```js
const { dragging } = useContext(DragContext);
  
return (
  <DragDrop
    className="axis"
    droppable={dragging && canHandleDrop(dragging)}
    onDrop={item => onChange([...items, item])}
  >
    {items.map(x => <div>{x.name}</div>)}
  </DragDrop>
);
```

## Limitations

Currently this is a very simple drag / drop mechanism. We don't support reordering out of the box, though it could probably be built on top of this solution without modification of the core.
